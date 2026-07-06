/* =====================================================
   ARTESÃS — cadastro + estatísticas automáticas de produção
   ===================================================== */

function salvarArtesa() {
  const id = document.getElementById('artesaEditId').value;
  const nome = document.getElementById('aNome').value.trim();
  const valorMin = parseFloat(document.getElementById('aValorMin').value) || 0;
  if (!nome || valorMin <= 0) { toast('Preencha nome e valor por minuto', 'error'); return; }
  const artesas = DB.get('artesas');
  const obj = id
    ? { ...artesas.find(a => a.id === id), nome, funcao: document.getElementById('aFuncao').value, valorMin }
    : { id: uid(), nome, funcao: document.getElementById('aFuncao').value, valorMin, totalProduzido: 0, totalRecebido: 0, ultimaProducao: null };
  if (id) {
    const i = artesas.findIndex(a => a.id === id);
    if (i >= 0) artesas[i] = obj;
  } else artesas.push(obj);
  DB.set('artesas', artesas);
  cancelarEdicaoArtesa();
  renderMaoObra();
  toast('Artesã salva!', 'success');
}

function cancelarEdicaoArtesa() {
  document.getElementById('artesaEditId').value = '';
  document.getElementById('aNome').value = '';
  document.getElementById('aFuncao').value = '';
  document.getElementById('aValorMin').value = '';
  document.getElementById('artesaFormTitle').textContent = '✦ Cadastrar artesã';
  document.getElementById('btnCancelarArtesa').style.display = 'none';
}

function editarArtesa(id) {
  const a = DB.get('artesas').find(x => x.id === id);
  if (!a) return;
  document.getElementById('artesaEditId').value = a.id;
  document.getElementById('aNome').value = a.nome;
  document.getElementById('aFuncao').value = a.funcao || '';
  document.getElementById('aValorMin').value = a.valorMin;
  document.getElementById('artesaFormTitle').textContent = '✦ Editar artesã';
  document.getElementById('btnCancelarArtesa').style.display = '';
}

function excluirArtesa(id) {
  if (!confirm('Excluir esta artesã?')) return;
  DB.set('artesas', DB.get('artesas').filter(a => a.id !== id));
  renderMaoObra();
  toast('Artesã excluída');
}

function renderMaoObra() {
  const artesas = DB.get('artesas');
  if (artesas.length === 0) {
    document.getElementById('artesasList').innerHTML = `<div class="empty-state"><div class="empty-icon">🧵</div><p>Nenhuma artesã cadastrada.</p></div>`;
    return;
  }
  document.getElementById('artesasList').innerHTML = `<div class="items-list">${artesas.map(a => `
    <div class="item-card">
      <div class="item-header">
        <div class="item-name">${a.nome}</div>
        ${a.funcao ? `<span class="item-badge badge-ok">${a.funcao}</span>` : ''}
      </div>
      <div class="item-details">
        <div class="item-detail">💰 <strong>R$ ${Number(a.valorMin).toFixed(2)}/min</strong></div>
        <div class="item-detail">🧵 Produzido: <strong>${a.totalProduzido || 0} un</strong></div>
        <div class="item-detail">💵 Recebido: <strong>${fmt(a.totalRecebido || 0)}</strong></div>
        <div class="item-detail">📅 Última produção: <strong>${a.ultimaProducao ? fmtDate(a.ultimaProducao) : '—'}</strong></div>
      </div>
      <div class="item-actions">
        <button class="btn-edit-sm" onclick="editarArtesa('${a.id}')">✏ Editar</button>
        <button class="btn-danger-sm" onclick="excluirArtesa('${a.id}')">🗑 Excluir</button>
      </div>
    </div>`).join('')}</div>`;
}
