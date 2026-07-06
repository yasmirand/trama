/* =====================================================
   MATERIAIS
   ===================================================== */

let materiaisFiltro = '';

function calcCustoUnitario() {
  const qtd = parseFloat(document.getElementById('mQtdComprada').value) || 0;
  const val = parseFloat(document.getElementById('mValorPago').value) || 0;
  document.getElementById('mCustoUni').value = (qtd > 0 && val > 0) ? (val / qtd).toFixed(6) : '';
}

function salvarMaterial() {
  const id = document.getElementById('materialEditId').value;
  const nome = document.getElementById('mNome').value.trim();
  const qtdC = parseFloat(document.getElementById('mQtdComprada').value) || 0;
  const valP = parseFloat(document.getElementById('mValorPago').value) || 0;
  if (!nome || qtdC <= 0 || valP <= 0) { toast('Preencha nome, quantidade e valor', 'error'); return; }

  const materiais = DB.get('materiais');
  const custoUni = valP / qtdC;

  if (id) {
    const i = materiais.findIndex(m => m.id === id);
    if (i >= 0) {
      materiais[i] = {
        ...materiais[i],
        nome,
        categ: document.getElementById('mCateg').value,
        unidade: document.getElementById('mUnidade').value,
        custoUni,
        estoqueMin: parseFloat(document.getElementById('mEstoqueMin').value) || 0
      };
    }
  } else {
    const obj = {
      id: uid(),
      nome,
      categ: document.getElementById('mCateg').value,
      unidade: document.getElementById('mUnidade').value,
      qtdComprada: qtdC,
      valorPago: valP,
      custoUni,
      estoqueAtual: qtdC,
      estoqueMin: parseFloat(document.getElementById('mEstoqueMin').value) || 0
    };
    materiais.push(obj);
    registrarMovimento(obj.id, 'compra', qtdC, 'Cadastro inicial', valP);
  }
  DB.set('materiais', materiais);
  cancelarEdicaoMaterial();
  renderMateriais();
  checkAlertas();
  toast('Material salvo!', 'success');
}

function registrarMovimento(materialId, tipo, qtd, motivo, valor = 0) {
  const movs = DB.get('movimentos');
  movs.push({ id: uid(), materialId, tipo, qtd, motivo, valor, data: today() });
  DB.set('movimentos', movs);
}

function cancelarEdicaoMaterial() {
  document.getElementById('materialEditId').value = '';
  document.getElementById('mNome').value = '';
  document.getElementById('mCateg').value = '';
  document.getElementById('mUnidade').value = 'uni';
  document.getElementById('mQtdComprada').value = '';
  document.getElementById('mValorPago').value = '';
  document.getElementById('mCustoUni').value = '';
  document.getElementById('mEstoqueMin').value = '';
  document.getElementById('materialFormTitle').textContent = '✦ Cadastrar material';
  document.getElementById('btnCancelarMaterial').style.display = 'none';
}

function editarMaterial(id) {
  const m = DB.get('materiais').find(x => x.id === id);
  if (!m) return;
  document.getElementById('materialEditId').value = m.id;
  document.getElementById('mNome').value = m.nome;
  document.getElementById('mCateg').value = m.categ || '';
  document.getElementById('mUnidade').value = m.unidade;
  document.getElementById('mQtdComprada').value = m.qtdComprada || '';
  document.getElementById('mValorPago').value = m.valorPago || '';
  document.getElementById('mCustoUni').value = m.custoUni ? m.custoUni.toFixed(6) : '';
  document.getElementById('mEstoqueMin').value = m.estoqueMin || '';
  document.getElementById('materialFormTitle').textContent = '✦ Editar material';
  document.getElementById('btnCancelarMaterial').style.display = '';
  document.getElementById('mNome').scrollIntoView({ behavior: 'smooth' });
}

function excluirMaterial(id) {
  if (!confirm('Excluir este material?')) return;
  DB.set('materiais', DB.get('materiais').filter(m => m.id !== id));
  renderMateriais();
  checkAlertas();
  toast('Material excluído');
}

function abrirMovimento(id, tipo) {
  document.getElementById('modalMovId').value = id;
  document.getElementById('modalMovTipo').value = tipo;
  document.getElementById('modalMovQtd').value = '';
  document.getElementById('modalMovMotivo').value = '';
  document.getElementById('modalMovTitulo').textContent = tipo === 'entrada' ? '✦ Entrada de estoque' : '✦ Saída de estoque';
  abrirModal('modalMovimento');
}

function confirmarMovimento() {
  const id = document.getElementById('modalMovId').value;
  const tipo = document.getElementById('modalMovTipo').value;
  const qtd = parseFloat(document.getElementById('modalMovQtd').value) || 0;
  const motivo = document.getElementById('modalMovMotivo').value;
  if (qtd <= 0) { toast('Informe quantidade', 'error'); return; }

  const materiais = DB.get('materiais');
  const i = materiais.findIndex(m => m.id === id);
  if (i < 0) return;

  if (tipo === 'entrada') {
    materiais[i].estoqueAtual += qtd;
    registrarMovimento(id, 'entrada', qtd, motivo || 'Entrada manual');
  } else {
    if (materiais[i].estoqueAtual < qtd) { toast('Estoque insuficiente', 'error'); return; }
    materiais[i].estoqueAtual -= qtd;
    registrarMovimento(id, 'saida', qtd, motivo || 'Saída manual');
  }
  DB.set('materiais', materiais);
  fecharModal('modalMovimento');
  renderMateriais();
  checkAlertas();
  toast('Movimentação registrada!', 'success');
}

function verHistoricoMaterial(id) {
  const m = DB.get('materiais').find(x => x.id === id);
  const movs = DB.get('movimentos').filter(x => x.materialId === id).reverse();
  document.getElementById('modalHistMatNome').textContent = m ? m.nome : 'Material';
  document.getElementById('modalHistMatLista').innerHTML = movs.length === 0
    ? '<p class="text-muted">Sem movimentações.</p>'
    : `<div class="mov-list">${movs.map(mv => `
      <div class="mov-item">
        <div class="mov-info">
          <div class="mov-desc">${mv.motivo || mv.tipo}</div>
          <div class="mov-date">${fmtDate(mv.data)}</div>
        </div>
        <div class="mov-value ${mv.tipo === 'saida' ? 'saida' : 'entrada'}">${mv.tipo === 'saida' ? '-' : '+'} ${mv.qtd} ${m?.unidade || ''}</div>
      </div>`).join('')}</div>`;
  abrirModal('modalHistMat');
}

function filtrarMateriais(valor) {
  materiaisFiltro = valor;
  renderMateriais();
}

function renderMateriais() {
  let materiais = DB.get('materiais');
  if (materiaisFiltro.trim()) {
    const q = normaliza(materiaisFiltro);
    materiais = materiais.filter(m => normaliza(m.nome).includes(q) || normaliza(m.categ).includes(q));
  }
  if (materiais.length === 0) {
    document.getElementById('materiaisList').innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><p>${materiaisFiltro ? 'Nenhum material encontrado.' : 'Nenhum material cadastrado.'}</p></div>`;
    return;
  }
  document.getElementById('materiaisList').innerHTML = `<div class="items-list">${materiais.map(m => {
    const status = m.estoqueAtual === 0 ? 'zero' : (m.estoqueAtual <= m.estoqueMin && m.estoqueMin > 0) ? 'low' : 'ok';
    const badgeLabel = status === 'zero' ? 'Zerado' : status === 'low' ? 'Baixo' : 'OK';
    return `<div class="item-card">
      <div class="item-header">
        <div>
          <div class="item-name">${m.nome}</div>
          ${m.categ ? `<div style="font-size:10px;color:var(--muted);margin-top:2px">${m.categ}</div>` : ''}
        </div>
        <span class="item-badge badge-${status}">${badgeLabel}</span>
      </div>
      <div class="item-details">
        <div class="item-detail">📊 Estoque: <strong>${m.estoqueAtual} ${m.unidade}</strong></div>
        <div class="item-detail">⚠ Mínimo: <strong>${m.estoqueMin} ${m.unidade}</strong></div>
        <div class="item-detail">💰 Custo/un: <strong>${fmt(m.custoUni)}</strong></div>
      </div>
      <div class="item-actions">
        <button class="btn-edit-sm" onclick="abrirMovimento('${m.id}','entrada')">+ Entrada</button>
        <button class="btn-edit-sm" onclick="abrirMovimento('${m.id}','saida')">- Saída</button>
        <button class="btn-edit-sm" onclick="verHistoricoMaterial('${m.id}')">📋 Hist.</button>
        <button class="btn-edit-sm" onclick="editarMaterial('${m.id}')">✏ Editar</button>
        <button class="btn-danger-sm" onclick="excluirMaterial('${m.id}')">🗑</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function checkAlertas() {
  const materiais = DB.get('materiais');
  const baixos = materiais.filter(m => m.estoqueAtual <= m.estoqueMin && m.estoqueMin > 0);
  const bar = document.getElementById('alertsBar');
  if (baixos.length === 0) { bar.classList.remove('visible'); return; }
  bar.innerHTML = '<strong>⚠ Estoque baixo:</strong> ' + baixos.map(m =>
    `<span class="alert-tag">${m.nome} (${m.estoqueAtual} ${m.unidade})</span>`
  ).join('');
  bar.classList.add('visible');
}
