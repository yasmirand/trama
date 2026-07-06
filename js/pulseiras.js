/* =====================================================
   PULSEIRAS — catálogo de modelos + produção
   ===================================================== */

let pulseirasFiltro = '';
let editRows = []; // linhas de materiais usadas no modal de edição

function filtrarPulseiras(valor) {
  pulseirasFiltro = valor;
  renderPulseiras();
}

function renderPulseiras() {
  let pulseiras = DB.get('pulseiras');
  if (pulseirasFiltro.trim()) {
    const q = normaliza(pulseirasFiltro);
    pulseiras = pulseiras.filter(p => normaliza(p.nome).includes(q));
  }
  if (pulseiras.length === 0) {
    document.getElementById('pulseirasList').innerHTML = `<div class="empty-state"><div class="empty-icon">📿</div><p>${pulseirasFiltro ? 'Nenhuma pulseira encontrada.' : 'Nenhuma pulseira cadastrada. Use a Calculadora para criar o primeiro modelo.'}</p></div>`;
    return;
  }
  document.getElementById('pulseirasList').innerHTML = `<div class="items-list">${pulseiras.map(p => {
    const lucro = (p.precoPadrao || 0) - (p.custoMedio || 0);
    const status = p.estoque === 0 ? 'zero' : 'ok';
    return `<div class="item-card">
      <div class="item-header">
        <div class="item-name">${p.nome}</div>
        <span class="item-badge badge-${status}">${p.estoque} em estoque</span>
      </div>
      <div class="item-details">
        <div class="item-detail">🏷 Preço: <strong>${fmt(p.precoPadrao)}</strong></div>
        <div class="item-detail">📦 Custo médio: <strong>${fmt(p.custoMedio)}</strong></div>
        <div class="item-detail">📈 Lucro est.: <strong>${fmt(lucro)}</strong></div>
        <div class="item-detail">⏱ Tempo médio: <strong>${p.tempoMedio || 0} min</strong></div>
        <div class="item-detail">🛍 Vendidas: <strong>${p.vendidas || 0}</strong></div>
        <div class="item-detail">🎁 Brindes: <strong>${p.brindes || 0}</strong></div>
        <div class="item-detail">🎉 Sorteios: <strong>${p.sorteios || 0}</strong></div>
      </div>
      <div class="item-actions">
        <button class="btn-produce" onclick="abrirProduzir('${p.id}')">🧵 Produzir</button>
        <button class="btn-edit-sm" onclick="abrirEditarPulseira('${p.id}')">✏ Editar</button>
        <button class="btn-edit-sm" onclick="abrirHistoricoPulseira('${p.id}')">📋 Histórico</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

/* ---------- PRODUZIR ---------- */

function abrirProduzir(pulseiraId) {
  const p = DB.get('pulseiras').find(x => x.id === pulseiraId);
  if (!p) return;
  document.getElementById('modalProduzirId').value = pulseiraId;
  document.getElementById('modalProduzirNome').textContent = '✦ Produzir: ' + p.nome;
  document.getElementById('modalProduzirQtd').value = 1;
  const artesas = DB.get('artesas');
  document.getElementById('modalProduzirArtesa').innerHTML = '<option value="">— Selecione —</option>' +
    artesas.map(a => `<option value="${a.id}">${a.nome} (R$${Number(a.valorMin).toFixed(2)}/min)</option>`).join('');
  const faltando = (p.materiais || []).some(m => {
    const mat = DB.get('materiais').find(x => x.id === m.materialId);
    return !mat;
  });
  document.getElementById('modalProduzirAviso').textContent = faltando ? '⚠ Um ou mais materiais desta receita não existem mais no estoque.' : '';
  abrirModal('modalProduzir');
}

function confirmarProducao() {
  const pulseiraId = document.getElementById('modalProduzirId').value;
  const qtd = parseInt(document.getElementById('modalProduzirQtd').value) || 0;
  const artesaId = document.getElementById('modalProduzirArtesa').value;
  if (qtd <= 0) { toast('Informe a quantidade produzida', 'error'); return; }
  if (!artesaId) { toast('Selecione a artesã responsável', 'error'); return; }

  const pulseiras = DB.get('pulseiras');
  const idx = pulseiras.findIndex(x => x.id === pulseiraId);
  if (idx < 0) return;
  const pulseira = pulseiras[idx];
  const materiais = DB.get('materiais');
  const artesas = DB.get('artesas');
  const artesa = artesas.find(a => a.id === artesaId);
  if (!artesa) { toast('Artesã inválida', 'error'); return; }

  // 1) checar estoque de materiais suficiente (usando preços/estoque ATUAIS)
  const receita = pulseira.materiais || [];
  for (const item of receita) {
    const mat = materiais.find(m => m.id === item.materialId);
    const necessario = (item.qtd || 0) * qtd;
    if (!mat) { toast('Material da receita não encontrado no estoque', 'error'); return; }
    if (mat.estoqueAtual < necessario) { toast(`Estoque insuficiente de "${mat.nome}"`, 'error'); return; }
  }

  // 2) baixar estoque de materiais e calcular custo de material (preço ATUAL)
  let custoMaterialTotal = 0;
  receita.forEach(item => {
    const mIdx = materiais.findIndex(m => m.id === item.materialId);
    const necessario = (item.qtd || 0) * qtd;
    custoMaterialTotal += materiais[mIdx].custoUni * necessario;
    materiais[mIdx].estoqueAtual -= necessario;
    registrarMovimento(item.materialId, 'saida', necessario, `Produção: ${pulseira.nome} (${qtd} un)`);
  });
  DB.set('materiais', materiais);

  // 3) custo de mão de obra (tempo médio da pulseira x minutos/valor da artesã)
  const minutosTotais = (pulseira.tempoMedio || 0) * qtd;
  const custoMO = artesa.valorMin * minutosTotais;

  // 4) custo unitário desta produção e nova média ponderada da pulseira
  const custoUnitarioProducao = (custoMaterialTotal + custoMO) / qtd;
  const unidadesAntigas = pulseira.unidadesProduzidas || 0;
  const custoMedioAntigo = pulseira.custoMedio || 0;
  const novoCustoMedio = unidadesAntigas + qtd > 0
    ? ((custoMedioAntigo * unidadesAntigas) + (custoUnitarioProducao * qtd)) / (unidadesAntigas + qtd)
    : custoUnitarioProducao;

  pulseira.custoMedio = novoCustoMedio;
  pulseira.unidadesProduzidas = unidadesAntigas + qtd;
  pulseira.estoque = (pulseira.estoque || 0) + qtd;
  pulseiras[idx] = pulseira;
  DB.set('pulseiras', pulseiras);

  // 5) registrar produção (alimenta financeiro e relatório da artesã)
  const producoes = DB.get('producoes');
  producoes.push({
    id: uid(), pulseiraId, pulseira: pulseira.nome, qtd, artesaId, artesa: artesa.nome,
    custoMaterial: custoMaterialTotal, custoMO, custoUnitario: custoUnitarioProducao,
    minutos: minutosTotais, data: today()
  });
  DB.set('producoes', producoes);

  // 6) atualizar estatísticas da artesã
  const artesaIdx = artesas.findIndex(a => a.id === artesaId);
  artesas[artesaIdx].totalProduzido = (artesas[artesaIdx].totalProduzido || 0) + qtd;
  artesas[artesaIdx].totalRecebido = (artesas[artesaIdx].totalRecebido || 0) + custoMO;
  artesas[artesaIdx].ultimaProducao = today();
  DB.set('artesas', artesas);

  fecharModal('modalProduzir');
  renderPulseiras();
  checkAlertas();
  toast(`Produção registrada! +${qtd} un. de ${pulseira.nome}`, 'success');
}

/* ---------- EDITAR ---------- */

function abrirEditarPulseira(id) {
  const p = DB.get('pulseiras').find(x => x.id === id);
  if (!p) return;
  document.getElementById('modalEditarId').value = id;
  document.getElementById('modalEditarNome').value = p.nome;
  document.getElementById('modalEditarPreco').value = p.precoPadrao;
  document.getElementById('modalEditarTempo').value = p.tempoMedio || 0;
  editRows = (p.materiais || []).map(m => ({ id: uid(), matId: m.materialId, qtd: m.qtd }));
  if (editRows.length === 0) editRows.push({ id: uid(), matId: '', qtd: 0 });
  renderEditRows();
  abrirModal('modalEditar');
}

function addEditRow() {
  editRows.push({ id: uid(), matId: '', qtd: 0 });
  renderEditRows();
}
function removeEditRow(rowId) {
  editRows = editRows.filter(r => r.id !== rowId);
  renderEditRows();
}
function updateEditRow(rowId, field, val) {
  const row = editRows.find(r => r.id === rowId);
  if (!row) return;
  row[field] = field === 'qtd' ? (parseFloat(val) || 0) : val;
}

function renderEditRows() {
  const materiais = DB.get('materiais');
  const opts = materiais.map(m => `<option value="${m.id}">${m.nome} (${m.unidade})</option>`).join('');
  document.getElementById('modalEditarMateriais').innerHTML = editRows.map(row => `
    <div class="calc-mat-row" id="editrow-${row.id}">
      <div>
        <select onchange="updateEditRow('${row.id}','matId',this.value)">
          <option value="">— Selecione —</option>${opts}
        </select>
      </div>
      <div>
        <input type="number" min="0" step="any" placeholder="Qtd" value="${row.qtd || ''}" oninput="updateEditRow('${row.id}','qtd',this.value)">
      </div>
      <div></div>
      <div><button class="btn-danger-sm" onclick="removeEditRow('${row.id}')">✕</button></div>
    </div>`).join('');
  editRows.forEach(row => {
    const sel = document.querySelector(`#editrow-${row.id} select`);
    if (sel && row.matId) sel.value = row.matId;
  });
}

function salvarEdicaoPulseira() {
  const id = document.getElementById('modalEditarId').value;
  const nome = document.getElementById('modalEditarNome').value.trim();
  const preco = parseFloat(document.getElementById('modalEditarPreco').value) || 0;
  const tempo = parseFloat(document.getElementById('modalEditarTempo').value) || 0;
  if (!nome) { toast('Informe o nome da pulseira', 'error'); return; }

  const pulseiras = DB.get('pulseiras');
  const idx = pulseiras.findIndex(p => p.id === id);
  if (idx < 0) return;

  pulseiras[idx].nome = nome;
  pulseiras[idx].precoPadrao = preco;
  pulseiras[idx].tempoMedio = tempo;
  pulseiras[idx].materiais = editRows.filter(r => r.matId && r.qtd > 0).map(r => ({ materialId: r.matId, qtd: r.qtd }));
  DB.set('pulseiras', pulseiras);
  fecharModal('modalEditar');
  renderPulseiras();
  toast('Pulseira atualizada!', 'success');
}

/* ---------- HISTÓRICO ---------- */

function abrirHistoricoPulseira(id) {
  const p = DB.get('pulseiras').find(x => x.id === id);
  if (!p) return;
  const producoes = DB.get('producoes').filter(pr => pr.pulseiraId === id).slice().reverse();
  document.getElementById('modalHistPulseiraNome').textContent = '✦ Histórico: ' + p.nome;
  document.getElementById('modalHistPulseiraLista').innerHTML = producoes.length === 0
    ? '<p class="text-muted">Nenhuma produção registrada ainda.</p>'
    : `<div class="mov-list">${producoes.map(pr => `
      <div class="mov-item">
        <div class="mov-info">
          <div class="mov-desc">+${pr.qtd} un. · ${pr.artesa}</div>
          <div class="mov-date">${fmtDate(pr.data)} · custo/un ${fmt(pr.custoUnitario)}</div>
        </div>
        <div class="mov-value entrada">${fmt(pr.custoMaterial + pr.custoMO)}</div>
      </div>`).join('')}</div>`;
  abrirModal('modalHistPulseira');
}
