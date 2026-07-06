/* =====================================================
   CALCULADORA — cria novos modelos de pulseira
   ===================================================== */

let calcRows = [];
let calcPrecoManual = null; // se o usuário editar manualmente o preço sugerido

function renderCalculadora() {
  const artesas = DB.get('artesas');
  const sel = document.getElementById('calcArtesa');
  sel.innerHTML = '<option value="">— Selecione —</option>' +
    artesas.map(a => `<option value="${a.id}">${a.nome} (R$${Number(a.valorMin).toFixed(2)}/min)</option>`).join('');
  sel.onchange = recalcular;
  if (calcRows.length === 0) addCalcMaterial();
  renderCalcMateriais();
}

function addCalcMaterial() {
  calcRows.push({ id: uid(), matId: '', qtd: 0 });
  renderCalcMateriais();
}

function renderCalcMateriais() {
  const materiais = DB.get('materiais');
  const opts = materiais.map(m => `<option value="${m.id}">${m.nome} (${m.unidade})</option>`).join('');
  document.getElementById('calcMateriais').innerHTML = calcRows.map(row => `
    <div class="calc-mat-row" id="calcrow-${row.id}">
      <div>
        <label>Material</label>
        <select onchange="updateCalcRow('${row.id}','matId',this.value)">
          <option value="">— Selecione —</option>${opts}
        </select>
      </div>
      <div>
        <label>Quantidade</label>
        <input type="number" min="0" step="any" placeholder="0" value="${row.qtd || ''}" oninput="updateCalcRow('${row.id}','qtd',this.value)">
      </div>
      <div class="mat-cost" id="calcCost-${row.id}">—</div>
      <div style="padding-top:14px"><button class="btn-danger-sm" onclick="removeCalcRow('${row.id}')">✕</button></div>
    </div>`).join('');
  calcRows.forEach(row => {
    const sel = document.querySelector(`#calcrow-${row.id} select`);
    if (sel && row.matId) sel.value = row.matId;
  });
  recalcular();
}

function updateCalcRow(id, field, val) {
  const row = calcRows.find(r => r.id === id);
  if (!row) return;
  if (field === 'qtd') row.qtd = parseFloat(val) || 0;
  else row[field] = val;
  recalcular();
}

function removeCalcRow(id) {
  calcRows = calcRows.filter(r => r.id !== id);
  renderCalcMateriais();
}

function editarPrecoSugerido(val) {
  calcPrecoManual = parseFloat(val) || 0;
}

function recalcular() {
  const materiais = DB.get('materiais');
  const artesas = DB.get('artesas');
  let totalMat = 0;
  const breakdown = [];

  calcRows.forEach(row => {
    const m = materiais.find(x => x.id === row.matId);
    if (m && row.qtd > 0) {
      const custo = m.custoUni * row.qtd;
      totalMat += custo;
      breakdown.push({ nome: `${m.nome} (${row.qtd} ${m.unidade})`, val: custo });
      const el = document.getElementById('calcCost-' + row.id);
      if (el) el.textContent = fmt(custo);
    } else {
      const el = document.getElementById('calcCost-' + row.id);
      if (el) el.textContent = '—';
    }
  });

  const artesaId = document.getElementById('calcArtesa').value;
  const minutos = parseFloat(document.getElementById('calcMinutos').value) || 0;
  let custoMO = 0;
  if (artesaId && minutos > 0) {
    const a = artesas.find(x => x.id === artesaId);
    if (a) {
      custoMO = a.valorMin * minutos;
      document.getElementById('calcMaoObraInfo').textContent = `${a.nome} · ${minutos} min · ${fmt(custoMO)}`;
      breakdown.push({ nome: `Mão de obra (${a.nome}, ${minutos} min)`, val: custoMO });
    }
  } else {
    document.getElementById('calcMaoObraInfo').textContent = '';
  }

  const total = totalMat + custoMO;
  const margem = parseFloat(document.getElementById('calcMargem').value) || 0;
  const sugeridoAuto = total * (1 + margem / 100);
  const precoFinal = calcPrecoManual !== null ? calcPrecoManual : sugeridoAuto;
  const lucroEst = precoFinal - total;

  document.getElementById('calcCustoTotal').textContent = fmt(total);
  const inputPreco = document.getElementById('calcPrecoSugerido');
  if (document.activeElement !== inputPreco) inputPreco.value = fmtN(precoFinal);

  document.getElementById('calcBreakdown').innerHTML = [
    ...breakdown.map(b => `<div class="calc-breakdown-row"><span>${b.nome}</span><span>${fmt(b.val)}</span></div>`),
    `<div class="calc-breakdown-row total"><span>Custo total</span><span>${fmt(total)}</span></div>`,
    `<div class="calc-breakdown-row total"><span>Preço de venda</span><span>R$ ${fmtN(precoFinal)}</span></div>`,
    `<div class="calc-breakdown-row total"><span>Lucro estimado</span><span>R$ ${fmtN(lucroEst)}</span></div>`,
  ].join('');
}

function salvarCalculadora() {
  const nome = document.getElementById('calcNome').value.trim();
  if (!nome) { toast('Informe o nome do produto', 'error'); return; }

  const materiais = DB.get('materiais');
  const minutos = parseFloat(document.getElementById('calcMinutos').value) || 0;
  const margem = parseFloat(document.getElementById('calcMargem').value) || 100;
  let totalMat = 0;
  const itens = [];

  calcRows.forEach(row => {
    const m = materiais.find(x => x.id === row.matId);
    if (m && row.qtd > 0) {
      totalMat += m.custoUni * row.qtd;
      itens.push({ materialId: m.id, qtd: row.qtd });
    }
  });

  const artesaId = document.getElementById('calcArtesa').value;
  const artesas = DB.get('artesas');
  let custoMO = 0;
  if (artesaId && minutos > 0) {
    const a = artesas.find(x => x.id === artesaId);
    if (a) custoMO = a.valorMin * minutos;
  }

  const total = totalMat + custoMO;
  const sugeridoAuto = total * (1 + margem / 100);
  const precoFinal = calcPrecoManual !== null ? calcPrecoManual : sugeridoAuto;

  const pulseiras = DB.get('pulseiras');
  pulseiras.push({
    id: uid(), nome, materiais: itens, tempoMedio: minutos,
    custoMedio: total, precoPadrao: precoFinal,
    estoque: 0, vendidas: 0, unidadesProduzidas: 0, criadoEm: today()
  });
  DB.set('pulseiras', pulseiras);

  // limpa formulário para o próximo cadastro
  document.getElementById('calcNome').value = '';
  document.getElementById('calcMinutos').value = '';
  document.getElementById('calcArtesa').value = '';
  document.getElementById('calcMargem').value = 100;
  calcRows = [];
  calcPrecoManual = null;
  addCalcMaterial();

  toast('Pulseira criada! Vá até a aba "Pulseiras" para produzi-la.', 'success');
}
