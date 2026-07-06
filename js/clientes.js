/* =====================================================
   CLIENTES
   ===================================================== */

function salvarCliente() {
  const id = document.getElementById('clienteEditId').value;
  const nome = document.getElementById('cNome').value.trim();
  if (!nome) { toast('Nome obrigatório', 'error'); return; }
  const clientes = DB.get('clientes');
  const obj = { id: id || uid(), nome, tel: document.getElementById('cTel').value, insta: document.getElementById('cInsta').value, obs: document.getElementById('cObs').value };
  if (id) {
    const i = clientes.findIndex(c => c.id === id);
    if (i >= 0) clientes[i] = obj;
  } else {
    clientes.push(obj);
  }
  DB.set('clientes', clientes);
  cancelarEdicaoCliente();
  renderClientes();
  atualizarSelectClientes();
  toast('Cliente salvo!', 'success');
}

function cancelarEdicaoCliente() {
  document.getElementById('clienteEditId').value = '';
  document.getElementById('cNome').value = '';
  document.getElementById('cTel').value = '';
  document.getElementById('cInsta').value = '';
  document.getElementById('cObs').value = '';
  document.getElementById('clienteFormTitle').textContent = '✦ Novo cliente';
  document.getElementById('btnCancelarCliente').style.display = 'none';
}

function editarCliente(id) {
  const c = DB.get('clientes').find(x => x.id === id);
  if (!c) return;
  document.getElementById('clienteEditId').value = c.id;
  document.getElementById('cNome').value = c.nome;
  document.getElementById('cTel').value = c.tel || '';
  document.getElementById('cInsta').value = c.insta || '';
  document.getElementById('cObs').value = c.obs || '';
  document.getElementById('clienteFormTitle').textContent = '✦ Editar cliente';
  document.getElementById('btnCancelarCliente').style.display = '';
  document.getElementById('cNome').scrollIntoView({ behavior: 'smooth' });
}

function excluirCliente(id) {
  if (!confirm('Excluir este cliente?')) return;
  DB.set('clientes', DB.get('clientes').filter(c => c.id !== id));
  renderClientes();
  atualizarSelectClientes();
  toast('Cliente excluído');
}

function verCliente(id) {
  const c = DB.get('clientes').find(x => x.id === id);
  if (!c) return;
  const pedidos = DB.get('pedidos').filter(p => p.clienteId === id);
  const total = pedidos.reduce((s, p) => s + (p.total || 0), 0);
  document.getElementById('modalClienteNome').textContent = c.nome;
  document.getElementById('modalClienteInfo').innerHTML = `
    <div class="item-details" style="flex-direction:column;gap:6px">
      ${c.tel ? `<div class="item-detail">📞 <strong>${c.tel}</strong></div>` : ''}
      ${c.insta ? `<div class="item-detail">📸 <strong>${c.insta}</strong></div>` : ''}
      ${c.obs ? `<div class="item-detail">💬 ${c.obs}</div>` : ''}
      <div class="item-detail">🛍 <strong>${pedidos.length}</strong> pedido(s) · Total: <strong>R$ ${fmtN(total)}</strong></div>
    </div>`;
  document.getElementById('modalClienteHistorico').innerHTML = pedidos.length === 0
    ? '<p class="text-muted">Nenhum pedido.</p>'
    : pedidos.map(p => `<div class="mov-item"><div class="mov-info"><div class="mov-desc">${p.pulseira}</div><div class="mov-date">${fmtDate(p.data)} · ${p.status}</div></div><div class="mov-value entrada">R$ ${fmtN(p.total)}</div></div>`).join('');
  abrirModal('modalCliente');
}

function renderClientes() {
  const clientes = DB.get('clientes');
  const pedidos = DB.get('pedidos');
  if (clientes.length === 0) {
    document.getElementById('clientesList').innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>Nenhum cliente cadastrado.</p></div>`;
    return;
  }
  document.getElementById('clientesList').innerHTML = `<div class="items-list">${clientes.map(c => {
    const cp = pedidos.filter(p => p.clienteId === c.id);
    const total = cp.reduce((s, p) => s + (p.total || 0), 0);
    return `<div class="item-card">
      <div class="item-header">
        <div class="item-name">${c.nome}</div>
        <span class="item-badge badge-ok">${cp.length} pedido(s)</span>
      </div>
      <div class="item-details">
        ${c.tel ? `<div class="item-detail">📞 ${c.tel}</div>` : ''}
        ${c.insta ? `<div class="item-detail">📸 ${c.insta}</div>` : ''}
        <div class="item-detail">💰 <strong>R$ ${fmtN(total)}</strong> total</div>
      </div>
      <div class="item-actions">
        <button class="btn-edit-sm" onclick="verCliente('${c.id}')">👁 Ver</button>
        <button class="btn-edit-sm" onclick="editarCliente('${c.id}')">✏ Editar</button>
        <button class="btn-danger-sm" onclick="excluirCliente('${c.id}')">🗑 Excluir</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function atualizarSelectClientes() {
  const clientes = DB.get('clientes');
  const s = document.getElementById('pCliente');
  if (!s) return;
  const val = s.value;
  s.innerHTML = '<option value="">— Sem cliente —</option><option value="__novo__">+ Novo cliente</option>' +
    clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  s.value = val;
}
