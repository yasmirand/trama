/* =====================================================
   DASHBOARD
   ===================================================== */

function renderDashboard() {
  const pulseiras = DB.get('pulseiras');
  const materiais = DB.get('materiais');
  const clientes = DB.get('clientes');
  const pedidos = DB.get('pedidos');

  const now = new Date();
  const mesAtual = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const r = calcularFinanceiroMes(mesAtual);

  const totalEstoquePulseiras = pulseiras.reduce((s, p) => s + (p.estoque || 0), 0);
  const pendentes = pedidos.filter(p => p.status !== 'entregue');
  const baixoEstoque = materiais.filter(m => m.estoqueAtual <= m.estoqueMin && m.estoqueMin > 0);

  document.getElementById('dashGrid').innerHTML = `
    <div class="dash-card dash-card-full">
      <div class="label">Receita do mês</div>
      <div class="value">R$ ${fmtN(r.totalReceita)}</div>
      <div class="sub">${r.pedidos.length} pedido(s) entregue(s) em ${nomeMes(now.getMonth())}</div>
    </div>
    <div class="dash-card">
      <div class="label">Lucro do mês</div>
      <div class="value ${r.lucro >= 0 ? 'positive' : 'negative'}">R$ ${fmtN(r.lucro)}</div>
      <div class="sub">após custos e despesas</div>
    </div>
    <div class="dash-card">
      <div class="label">Total de pedidos</div>
      <div class="value">${pedidos.length}</div>
      <div class="sub">${pendentes.length} pendente(s)</div>
    </div>
    <div class="dash-card">
      <div class="label">Pulseiras em estoque</div>
      <div class="value">${totalEstoquePulseiras}</div>
      <div class="sub">${pulseiras.length} modelo(s) cadastrados</div>
    </div>
    <div class="dash-card">
      <div class="label">Clientes</div>
      <div class="value">${clientes.length}</div>
      <div class="sub">cadastrados</div>
    </div>
  `;

  renderGraficoEvolucao();
  renderMaisVendidasDash();
  renderEstoqueBaixoDash(baixoEstoque);
  renderPedidosPendentesDash(pendentes);
}

function renderGraficoEvolucao() {
  const meses = ultimosMeses(6);
  const dados = meses.map(m => {
    const r = calcularFinanceiroMes(m.key);
    return { ...m, faturamento: r.totalReceita, lucro: r.lucro };
  });
  const max = Math.max(1, ...dados.map(d => Math.max(d.faturamento, d.lucro)));
  const w = 560, h = 160, padBottom = 24, barGap = 10;
  const groupW = w / dados.length;
  const barW = (groupW - barGap * 2) / 2;

  const bars = dados.map((d, i) => {
    const x0 = i * groupW + barGap / 2;
    const hFat = (d.faturamento / max) * (h - padBottom);
    const hLucro = (Math.max(d.lucro, 0) / max) * (h - padBottom);
    const yFat = h - padBottom - hFat;
    const yLucro = h - padBottom - hLucro;
    return `
      <rect x="${x0}" y="${yFat}" width="${barW}" height="${hFat}" rx="3" fill="var(--rose)"></rect>
      <rect x="${x0 + barW + 2}" y="${yLucro}" width="${barW}" height="${hLucro}" rx="3" fill="var(--sage-dark)"></rect>
      <text x="${x0 + barW}" y="${h - 6}" font-size="9" fill="var(--muted)" text-anchor="middle" font-family="DM Sans, sans-serif">${d.label}</text>
    `;
  }).join('');

  document.getElementById('dashChart').innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>
    <div class="chart-legend"><span class="leg-fat">Faturamento</span><span class="leg-lucro">Lucro</span></div>
  `;
}

function renderMaisVendidasDash() {
  const pulseiras = [...DB.get('pulseiras')].sort((a, b) => (b.vendidas || 0) - (a.vendidas || 0)).slice(0, 5);
  const box = document.getElementById('dashMaisVendidas');
  if (pulseiras.length === 0 || pulseiras.every(p => !p.vendidas)) {
    box.innerHTML = '<p class="text-muted">Nenhuma venda registrada ainda.</p>';
    return;
  }
  box.innerHTML = `<div class="mini-list">${pulseiras.filter(p => p.vendidas > 0).map(p => `
    <div class="mini-row"><div><div class="mini-name">${p.nome}</div><div class="mini-sub">${p.vendidas} vendida(s)</div></div><div class="mini-val">${fmt(p.precoPadrao)}</div></div>
  `).join('')}</div>`;
}

function renderEstoqueBaixoDash(baixos) {
  const box = document.getElementById('dashEstoqueBaixo');
  if (baixos.length === 0) { box.innerHTML = '<p class="text-muted">Todos os materiais estão com estoque saudável.</p>'; return; }
  box.innerHTML = `<div class="mini-list">${baixos.map(m => `
    <div class="mini-row"><div><div class="mini-name">${m.nome}</div><div class="mini-sub">mínimo: ${m.estoqueMin} ${m.unidade}</div></div><div class="mini-val">${m.estoqueAtual} ${m.unidade}</div></div>
  `).join('')}</div>`;
}

function renderPedidosPendentesDash(pendentes) {
  const box = document.getElementById('dashPedidosPendentes');
  if (pendentes.length === 0) { box.innerHTML = '<p class="text-muted">Nenhum pedido pendente 🎉</p>'; return; }
  box.innerHTML = `<div class="mini-list">${pendentes.slice(0, 6).map(p => `
    <div class="mini-row"><div><div class="mini-name">${p.pulseira}${p.cliente ? ' — ' + p.cliente : ''}</div><div class="mini-sub">${fmtDate(p.data)}</div></div><div class="mini-val">${fmt(p.total)}</div></div>
  `).join('')}</div>`;
}
