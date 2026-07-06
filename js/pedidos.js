/* =====================================================
   PEDIDOS — substitui o antigo conceito de "vendas"
   =====================================================
   Tipos de pedido:
   - venda: funciona normalmente, gera receita, pode ter valor pago/a receber
   - brinde: baixa estoque, não gera receita, registra o custo como despesa (categ "brindes")
   - sorteio: baixa estoque, não gera receita, registra o custo como despesa (categ "sorteios")
*/

let pedidosFiltroTipo = 'todos';
let pedidosFiltroStatus = 'todos';

const TIPO_PEDIDO_LABEL = { venda: 'Venda', brinde: 'Brinde', sorteio: 'Prêmio de sorteio' };

function atualizarSelectPulseirasPedido() {
  const pulseiras = DB.get('pulseiras');
  const sel = document.getElementById('pPulseira');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Selecione —</option>' +
    pulseiras.map(p => `<option value="${p.id}">${p.nome} (${p.estoque} em estoque)</option>`).join('');
}

function onPulseiraPedidoChange() {
  const pulseiraId = document.getElementById('pPulseira').value;
  const p = DB.get('pulseiras').find(x => x.id === pulseiraId);
  const info = document.getElementById('pEstoqueInfo');
  if (!p) { info.textContent = ''; document.getElementById('pPrecoUnit').value = ''; return; }
  info.textContent = `Estoque disponível: ${p.estoque} un. · Preço padrão: ${fmt(p.precoPadrao)}`;
  document.getElementById('pPrecoUnit').value = p.precoPadrao;
  calcTotalPedido();
}

/** Mostra/esconde os campos de preço e pagamento conforme o tipo do pedido */
function onTipoPedidoChange() {
  const tipo = document.getElementById('pTipo').value;
  const isVenda = tipo === 'venda';
  ['pPrecoUnitWrap', 'pTotalWrap', 'pFormaPagamentoWrap', 'pValorPagoWrap', 'pValorRestanteWrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isVenda ? '' : 'none';
  });
  if (!isVenda) {
    document.getElementById('pValorPago').value = '';
  }
  calcTotalPedido();
}

function calcTotalPedido() {
  const qtd = parseFloat(document.getElementById('pQtd').value) || 0;
  const precoUnit = parseFloat(document.getElementById('pPrecoUnit').value) || 0;
  const total = qtd * precoUnit;
  document.getElementById('pTotal').value = 'R$ ' + fmtN(total);
  const valorPago = parseFloat(document.getElementById('pValorPago').value) || 0;
  document.getElementById('pValorRestante').value = 'R$ ' + fmtN(Math.max(total - valorPago, 0));
}

function salvarPedido() {
  const tipo = document.getElementById('pTipo').value || 'venda';
  const pulseiraId = document.getElementById('pPulseira').value;
  const qtd = parseInt(document.getElementById('pQtd').value) || 0;
  const data = document.getElementById('pData').value || today();
  const obs = document.getElementById('pObs').value.trim();

  if (!pulseiraId) { toast('Selecione a pulseira', 'error'); return; }
  if (qtd <= 0) { toast('Informe a quantidade', 'error'); return; }

  const pulseiras = DB.get('pulseiras');
  const pIdx = pulseiras.findIndex(p => p.id === pulseiraId);
  if (pIdx < 0) return;
  const pulseira = pulseiras[pIdx];

  // Só permite criar pedido se houver estoque suficiente
  if (pulseira.estoque < qtd) {
    toast(`Estoque insuficiente de "${pulseira.nome}" (disponível: ${pulseira.estoque})`, 'error');
    return;
  }

  let clienteId = document.getElementById('pCliente').value;
  let clienteNome = '';
  if (clienteId === '__novo__') { toast('Cadastre o cliente primeiro na aba Clientes', 'error'); return; }
  if (clienteId) {
    const c = DB.get('clientes').find(x => x.id === clienteId);
    clienteNome = c ? c.nome : '';
  }

  let precoUnit = 0, total = 0, valorPago = 0, valorRestante = 0, formaPagamento = '', custoTotal = 0;

  if (tipo === 'venda') {
    precoUnit = parseFloat(document.getElementById('pPrecoUnit').value) || 0;
    if (precoUnit <= 0) { toast('Preencha o preço unitário', 'error'); return; }
    total = qtd * precoUnit;
    valorPago = parseFloat(document.getElementById('pValorPago').value) || 0;
    valorRestante = Math.max(total - valorPago, 0);
    formaPagamento = document.getElementById('pFormaPagamento').value;
  } else {
    // Brinde / Prêmio de sorteio: não gera receita, apenas custo (a valor de custo médio atual da pulseira)
    custoTotal = (pulseira.custoMedio || 0) * qtd;
  }

  const pedidos = DB.get('pedidos');
  pedidos.push({
    id: uid(), clienteId, cliente: clienteNome, pulseiraId, pulseira: pulseira.nome,
    tipo,
    qtd, precoPadrao: pulseira.precoPadrao, precoUnit, total,
    formaPagamento, valorPago, valorRestante, custoTotal, obs,
    status: 'pendente', // pendente | entregue
    data
  });
  DB.set('pedidos', pedidos);

  document.getElementById('pTipo').value = 'venda';
  document.getElementById('pQtd').value = 1;
  document.getElementById('pPrecoUnit').value = '';
  document.getElementById('pValorPago').value = '';
  document.getElementById('pTotal').value = '';
  document.getElementById('pValorRestante').value = '';
  document.getElementById('pObs').value = '';
  onTipoPedidoChange();
  renderPedidos();
  toast('Pedido registrado!', 'success');
}

function excluirPedido(id) {
  if (!confirm('Excluir este pedido? Se já estava entregue, o estoque NÃO será restaurado automaticamente.')) return;
  DB.set('pedidos', DB.get('pedidos').filter(p => p.id !== id));
  renderPedidos();
  toast('Pedido excluído');
}

function concluirPedido(id) {
  const pedidos = DB.get('pedidos');
  const idx = pedidos.findIndex(p => p.id === id);
  if (idx < 0) return;
  const pedido = pedidos[idx];
  if (pedido.status === 'entregue') return;
  const tipo = pedido.tipo || 'venda';

  const pulseiras = DB.get('pulseiras');
  const pIdx = pulseiras.findIndex(p => p.id === pedido.pulseiraId);
  if (pIdx < 0) { toast('Pulseira do pedido não encontrada', 'error'); return; }
  if (pulseiras[pIdx].estoque < pedido.qtd) { toast('Estoque insuficiente para concluir este pedido', 'error'); return; }

  pulseiras[pIdx].estoque -= pedido.qtd;
  if (tipo === 'venda') {
    pulseiras[pIdx].vendidas = (pulseiras[pIdx].vendidas || 0) + pedido.qtd;
  } else if (tipo === 'brinde') {
    pulseiras[pIdx].brindes = (pulseiras[pIdx].brindes || 0) + pedido.qtd;
  } else if (tipo === 'sorteio') {
    pulseiras[pIdx].sorteios = (pulseiras[pIdx].sorteios || 0) + pedido.qtd;
  }
  DB.set('pulseiras', pulseiras);

  pedido.status = 'entregue';
  pedido.dataConclusao = today();

  // Brinde/sorteio: registra o custo da pulseira como despesa da categoria correspondente
  if (tipo !== 'venda') {
    const despesas = DB.get('despesas');
    despesas.push({
      id: uid(),
      desc: `${TIPO_PEDIDO_LABEL[tipo]}: ${pedido.pulseira} (${pedido.qtd} un)`,
      valor: pedido.custoTotal || 0,
      data: pedido.dataConclusao,
      categ: tipo === 'brinde' ? 'brindes' : 'sorteios'
    });
    DB.set('despesas', despesas);
  }

  pedidos[idx] = pedido;
  DB.set('pedidos', pedidos);

  renderPedidos();
  toast(tipo === 'venda' ? 'Pedido entregue! Estoque e financeiro atualizados.' : 'Registrado! Estoque e despesas atualizados.', 'success');
}

function registrarPagamentoPedido(id, valor) {
  const pedidos = DB.get('pedidos');
  const idx = pedidos.findIndex(p => p.id === id);
  if (idx < 0) return;
  const v = parseFloat(valor) || 0;
  if (v <= 0) return;
  pedidos[idx].valorPago = (pedidos[idx].valorPago || 0) + v;
  pedidos[idx].valorRestante = Math.max(pedidos[idx].total - pedidos[idx].valorPago, 0);
  DB.set('pedidos', pedidos);
  renderPedidos();
  toast('Pagamento registrado!', 'success');
}

function abrirPagamentoPedido(id) {
  const valor = prompt('Valor recebido (R$):');
  if (valor === null) return;
  registrarPagamentoPedido(id, valor);
}

function filtrarPedidosTipo(v) { pedidosFiltroTipo = v; renderPedidos(); }
function filtrarPedidosStatus(v) { pedidosFiltroStatus = v; renderPedidos(); }

/** Painel de resumo no topo da aba Pedidos — recalculado a cada render */
function renderResumoPedidos() {
  const pedidos = DB.get('pedidos');
  const vendas = pedidos.filter(p => (p.tipo || 'venda') === 'venda');
  const brindes = pedidos.filter(p => p.tipo === 'brinde');
  const sorteios = pedidos.filter(p => p.tipo === 'sorteio');

  const totalVendas = vendas.reduce((s, p) => s + (p.total || 0), 0);
  const totalRecebido = vendas.reduce((s, p) => s + (p.valorPago || 0), 0);
  const totalAReceber = vendas.reduce((s, p) => s + (p.valorRestante || 0), 0);
  const totalBrindes = brindes.reduce((s, p) => s + (p.custoTotal || 0), 0);
  const totalSorteios = sorteios.reduce((s, p) => s + (p.custoTotal || 0), 0);

  document.getElementById('pedidosResumo').innerHTML = `
    <div class="dash-card"><div class="label">Total de pedidos</div><div class="value">${pedidos.length}</div></div>
    <div class="dash-card"><div class="label">Valor total das vendas</div><div class="value">R$ ${fmtN(totalVendas)}</div></div>
    <div class="dash-card"><div class="label">Valor recebido</div><div class="value positive">R$ ${fmtN(totalRecebido)}</div></div>
    <div class="dash-card"><div class="label">Valor a receber</div><div class="value negative">R$ ${fmtN(totalAReceber)}</div></div>
    <div class="dash-card"><div class="label">Investido em brindes</div><div class="value">R$ ${fmtN(totalBrindes)}</div></div>
    <div class="dash-card"><div class="label">Investido em sorteios</div><div class="value">R$ ${fmtN(totalSorteios)}</div></div>
  `;
}

function renderPedidos() {
  atualizarSelectClientes();
  atualizarSelectPulseirasPedido();
  document.getElementById('pData').value = document.getElementById('pData').value || today();
  onTipoPedidoChange();

  renderResumoPedidos();

  let pedidos = DB.get('pedidos').slice().sort((a, b) => (b.data > a.data ? 1 : -1));
  if (pedidosFiltroTipo !== 'todos') pedidos = pedidos.filter(p => (p.tipo || 'venda') === pedidosFiltroTipo);
  if (pedidosFiltroStatus !== 'todos') pedidos = pedidos.filter(p => p.status === pedidosFiltroStatus);

  if (pedidos.length === 0) {
    document.getElementById('pedidosList').innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Nenhum pedido encontrado.</p></div>`;
    return;
  }

  document.getElementById('pedidosList').innerHTML = `<div class="items-list">${pedidos.map(p => {
    const tipo = p.tipo || 'venda';
    const isVenda = tipo === 'venda';
    const pagStatus = p.valorRestante > 0 ? (p.valorPago > 0 ? 'parcial' : 'pendente') : 'pago';
    return `<div class="item-card">
      <div class="item-header">
        <div>
          <div class="item-name">${p.pulseira}</div>
          ${p.cliente ? `<div style="font-size:11px;color:var(--muted)">${p.cliente}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
          <span class="item-badge badge-${p.status}">${p.status === 'entregue' ? 'Entregue' : 'Pendente'}</span>
          ${!isVenda ? `<span class="item-badge badge-low">${TIPO_PEDIDO_LABEL[tipo]}</span>` : ''}
        </div>
      </div>
      <div class="item-details">
        <div class="item-detail">📅 ${fmtDate(p.data)}</div>
        <div class="item-detail">📦 Qtd: <strong>${p.qtd}</strong></div>
        ${isVenda
          ? `<div class="item-detail">💰 Total: <strong>R$ ${fmtN(p.total)}</strong></div><div class="item-detail">💳 ${p.formaPagamento || '—'}</div>`
          : `<div class="item-detail">💸 Custo: <strong>${fmt(p.custoTotal)}</strong></div>`}
        ${isVenda ? `<span class="item-badge badge-${pagStatus}">${pagStatus === 'pago' ? 'Pago' : pagStatus === 'parcial' ? 'Parcial: falta ' + fmt(p.valorRestante) : 'A receber: ' + fmt(p.valorRestante)}</span>` : ''}
      </div>
      <div class="item-actions">
        ${p.status !== 'entregue' ? `<button class="btn-edit-sm" onclick="concluirPedido('${p.id}')">✔ Marcar entregue</button>` : ''}
        ${isVenda && p.valorRestante > 0 ? `<button class="btn-edit-sm" onclick="abrirPagamentoPedido('${p.id}')">💵 Registrar pagamento</button>` : ''}
        ${isVenda && p.status === 'entregue' ? `<button class="btn-edit-sm" onclick="abrirRecibo('${p.id}')">📄 Gerar recibo</button>` : ''}
        <button class="btn-danger-sm" onclick="excluirPedido('${p.id}')">🗑 Excluir</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}
