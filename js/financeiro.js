/* =====================================================
   FINANCEIRO
   ===================================================== */

function initFinanceiro() {
  const now = new Date();
  document.getElementById('finMes').value = now.getMonth();
  document.getElementById('finAno').value = now.getFullYear();
  document.getElementById('despData').value = today();
}

/** Calcula os números do mês (usado tanto pela tela quanto pelo dashboard) */
function calcularFinanceiroMes(prefixo) {
  const pedidos = DB.get('pedidos').filter(p => p.status === 'entregue' && (p.tipo || 'venda') === 'venda' && mesAno(p.dataConclusao || p.data) === prefixo);
  const totalReceita = pedidos.reduce((s, p) => s + p.total, 0);

  const producoes = DB.get('producoes').filter(pr => mesAno(pr.data) === prefixo);
  const custoMat = producoes.reduce((s, pr) => s + (pr.custoMaterial || 0), 0);
  const custoMO = producoes.reduce((s, pr) => s + (pr.custoMO || 0), 0);

  const despesas = DB.get('despesas').filter(d => mesAno(d.data) === prefixo);
  const totalDesp = despesas.reduce((s, d) => s + d.valor, 0);
  const totalBrindesDesp = despesas.filter(d => d.categ === 'brindes').reduce((s, d) => s + d.valor, 0);
  const totalSorteiosDesp = despesas.filter(d => d.categ === 'sorteios').reduce((s, d) => s + d.valor, 0);
  const totalOutrasDesp = totalDesp - totalBrindesDesp - totalSorteiosDesp;

  const lucro = totalReceita - custoMat - custoMO - totalDesp;
  return { totalReceita, custoMat, custoMO, totalDesp, totalBrindesDesp, totalSorteiosDesp, totalOutrasDesp, lucro, pedidos, despesas };
}

/** Rótulo amigável da categoria de despesa */
function categDespesaLabel(c) {
  return c === 'brindes' ? 'Brinde' : c === 'sorteios' ? 'Sorteio' : 'Outra';
}

function gerarFinanceiro() {
  const mes = parseInt(document.getElementById('finMes').value);
  const ano = parseInt(document.getElementById('finAno').value);
  const prefixo = ano + '-' + String(mes + 1).padStart(2, '0');
  const r = calcularFinanceiroMes(prefixo);

  document.getElementById('finConteudo').innerHTML = `
    <div class="fin-section">
      <div class="fin-section-title">Receitas</div>
      <div class="fin-row"><span class="fin-label">Pedidos entregues</span><span class="fin-val green">R$ ${fmtN(r.totalReceita)}</span></div>
    </div>
    <div class="fin-section">
      <div class="fin-section-title">Saídas</div>
      <div class="fin-row"><span class="fin-label">Materiais consumidos na produção</span><span class="fin-val red">R$ ${fmtN(r.custoMat)}</span></div>
      <div class="fin-row"><span class="fin-label">Mão de obra</span><span class="fin-val red">R$ ${fmtN(r.custoMO)}</span></div>
      <div class="fin-row"><span class="fin-label">Brindes</span><span class="fin-val red">R$ ${fmtN(r.totalBrindesDesp)}</span></div>
      <div class="fin-row"><span class="fin-label">Sorteios</span><span class="fin-val red">R$ ${fmtN(r.totalSorteiosDesp)}</span></div>
      <div class="fin-row"><span class="fin-label">Outras despesas</span><span class="fin-val red">R$ ${fmtN(r.totalOutrasDesp)}</span></div>
      ${r.despesas.map(d => `<div class="fin-row" style="padding-left:20px;background:#fafafa"><span class="fin-label" style="font-size:12px;color:var(--muted)">↳ [${categDespesaLabel(d.categ)}] ${d.desc}</span><span class="fin-val" style="font-size:12px;color:var(--muted)">R$ ${fmtN(d.valor)}</span></div>`).join('')}
    </div>
    <div class="fin-total-row">
      <span class="fin-label">Lucro líquido do mês</span>
      <span class="fin-val">R$ ${fmtN(r.lucro)}</span>
    </div>
    <h2 class="section-title" style="margin-top:20px">Produtos mais lucrativos e mais vendidos</h2>
    ${renderRankingProdutos(prefixo)}
  `;
}

function renderRankingProdutos(prefixo) {
  const pedidos = DB.get('pedidos').filter(p => p.status === 'entregue' && mesAno(p.dataConclusao || p.data) === prefixo);
  const pulseiras = DB.get('pulseiras');
  const porPulseira = {};
  pedidos.forEach(p => {
    if (!porPulseira[p.pulseiraId]) porPulseira[p.pulseiraId] = { nome: p.pulseira, qtd: 0, receita: 0 };
    porPulseira[p.pulseiraId].qtd += p.qtd;
    porPulseira[p.pulseiraId].receita += p.total;
  });
  const lista = Object.entries(porPulseira).map(([id, v]) => {
    const p = pulseiras.find(x => x.id === id);
    const custoMedio = p ? p.custoMedio : 0;
    const lucro = v.receita - custoMedio * v.qtd;
    return { nome: v.nome, qtd: v.qtd, receita: v.receita, lucro };
  });

  if (lista.length === 0) return '<p class="text-muted">Sem pedidos entregues neste mês.</p>';

  const maisVendidos = [...lista].sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  const maisLucrativos = [...lista].sort((a, b) => b.lucro - a.lucro).slice(0, 5);

  return `
    <div class="mini-list mb-12">
      <div class="fin-section-title" style="margin-top:6px">Mais vendidos</div>
      ${maisVendidos.map(v => `<div class="mini-row"><div><div class="mini-name">${v.nome}</div><div class="mini-sub">${v.qtd} un. vendidas</div></div><div class="mini-val">${fmt(v.receita)}</div></div>`).join('')}
    </div>
    <div class="mini-list">
      <div class="fin-section-title">Mais lucrativos</div>
      ${maisLucrativos.map(v => `<div class="mini-row"><div><div class="mini-name">${v.nome}</div><div class="mini-sub">${v.qtd} un. vendidas</div></div><div class="mini-val">${fmt(v.lucro)}</div></div>`).join('')}
    </div>`;
}

function salvarDespesa() {
  const desc = document.getElementById('despDesc').value.trim();
  const valor = parseFloat(document.getElementById('despValor').value) || 0;
  const data = document.getElementById('despData').value || today();
  const categ = document.getElementById('despCateg').value || 'outras';
  if (!desc || valor <= 0) { toast('Preencha descrição e valor', 'error'); return; }
  const despesas = DB.get('despesas');
  despesas.push({ id: uid(), desc, valor, data, categ });
  DB.set('despesas', despesas);
  document.getElementById('despDesc').value = '';
  document.getElementById('despValor').value = '';
  document.getElementById('despCateg').value = 'outras';
  gerarFinanceiro();
  toast('Despesa salva!', 'success');
}
