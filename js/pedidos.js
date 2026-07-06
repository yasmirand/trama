/* =====================================================
   PEDIDOS — substitui o antigo conceito de "vendas"
   ===================================================== */

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

function calcTotalPedido() {
  const qtd = parseFloat(document.getElementById('pQtd').value) || 0;
  const precoUnit = parseFloat(document.getElementById('pPrecoUnit').value) || 0;
  const total = qtd * precoUnit;
  document.getElementById('pTotal').value = 'R$ ' + fmtN(total);
  const valorPago = parseFloat(document.getElementById('pValorPago').value) || 0;
  document.getElementById('pValorRestante').value = 'R$ ' + fmtN(Math.max(total - valorPago, 0));
}

function salvarPedido() {
  const pulseiraId = document.getElementById('pPulseira').value;
  const qtd = parseInt(document.getElementById('pQtd').value) || 0;
  const precoUnit = parseFloat(document.getElementById('pPrecoUnit').value) || 0;
  const data = document.getElementById('pData').value || today();
  const formaPagamento = document.getElementById('pFormaPagamento').value;
  const valorPago = parseFloat(document.getElementById('pValorPago').value) || 0;

  if (!pulseiraId) { toast('Selecione a pulseira', 'error'); return; }
  if (qtd <= 0 || precoUnit <= 0) { toast('Preencha quantidade e preço', 'error'); return; }

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

  const total = qtd * precoUnit;
  const valorRestante = Math.max(total - valorPago, 0);
  const obs = document.getElementById('pObs').value.trim();
  const pedidos = DB.get('pedidos');
  pedidos.push({
    id: uid(), clienteId, cliente: clienteNome, pulseiraId, pulseira: pulseira.nome,
    qtd, precoPadrao: pulseira.precoPadrao, precoUnit, total,
    formaPagamento, valorPago, valorRestante, obs,
    status: 'pendente', // pendente | entregue
    data
  });
  DB.set('pedidos', pedidos);

  document.getElementById('pQtd').value = 1;
  document.getElementById('pPrecoUnit').value = '';
  document.getElementById('pValorPago').value = '';
  document.getElementById('pTotal').value = '';
  document.getElementById('pValorRestante').value = '';
  document.getElementById('pObs').value = '';
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

  const pulseiras = DB.get('pulseiras');
  const pIdx = pulseiras.findIndex(p => p.id === pedido.pulseiraId);
  if (pIdx < 0) { toast('Pulseira do pedido não encontrada', 'error'); return; }
  if (pulseiras[pIdx].estoque < pedido.qtd) { toast('Estoque insuficiente para concluir este pedido', 'error'); return; }

  pulseiras[pIdx].estoque -= pedido.qtd;
  pulseiras[pIdx].vendidas = (pulseiras[pIdx].vendidas || 0) + pedido.qtd;
  DB.set('pulseiras', pulseiras);

  pedido.status = 'entregue';
  pedido.dataConclusao = today();
  pedidos[idx] = pedido;
  DB.set('pedidos', pedidos);

  renderPedidos();
  toast('Pedido entregue! Estoque e financeiro atualizados.', 'success');
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

function renderPedidos() {
  atualizarSelectClientes();
  atualizarSelectPulseirasPedido();
  document.getElementById('pData').value = document.getElementById('pData').value || today();

  const pedidos = DB.get('pedidos').slice().sort((a, b) => (b.data > a.data ? 1 : -1));
  if (pedidos.length === 0) {
    document.getElementById('pedidosList').innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Nenhum pedido registrado.</p></div>`;
    return;
  }
  document.getElementById('pedidosList').innerHTML = `<div class="items-list">${pedidos.map(p => {
    const pagStatus = p.valorRestante > 0 ? (p.valorPago > 0 ? 'parcial' : 'pendente') : 'pago';
    return `<div class="item-card">
      <div class="item-header">
        <div>
          <div class="item-name">${p.pulseira}</div>
          ${p.cliente ? `<div style="font-size:11px;color:var(--muted)">${p.cliente}</div>` : ''}
        </div>
        <span class="item-badge badge-${p.status}">${p.status === 'entregue' ? 'Entregue' : 'Pendente'}</span>
      </div>
      <div class="item-details">
        <div class="item-detail">📅 ${fmtDate(p.data)}</div>
        <div class="item-detail">📦 Qtd: <strong>${p.qtd}</strong></div>
        <div class="item-detail">💰 Total: <strong>R$ ${fmtN(p.total)}</strong></div>
        <div class="item-detail">💳 ${p.formaPagamento || '—'}</div>
        <span class="item-badge badge-${pagStatus}">${pagStatus === 'pago' ? 'Pago' : pagStatus === 'parcial' ? 'Parcial: falta ' + fmt(p.valorRestante) : 'A receber: ' + fmt(p.valorRestante)}</span>
      </div>
      <div class="item-actions">
        ${p.status !== 'entregue' ? `<button class="btn-edit-sm" onclick="concluirPedido('${p.id}')">✔ Marcar entregue</button>` : ''}
        ${p.valorRestante > 0 ? `<button class="btn-edit-sm" onclick="abrirPagamentoPedido('${p.id}')">💵 Registrar pagamento</button>` : ''}
        ${p.status === 'entregue' ? `<button class="btn-edit-sm" onclick="abrirRecibo('${p.id}')">📄 Gerar recibo</button>` : ''}
        <button class="btn-danger-sm" onclick="excluirPedido('${p.id}')">🗑 Excluir</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}