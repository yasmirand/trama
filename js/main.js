/* =====================================================
   MAIN — navegação entre abas + inicialização
   ===================================================== */

function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => { if (b.getAttribute('onclick').includes("'" + id + "'")) b.classList.add('active'); });

  if (id === 'dashboard') renderDashboard();
  if (id === 'pulseiras') renderPulseiras();
  if (id === 'calculadora') renderCalculadora();
  if (id === 'materiais') renderMateriais();
  if (id === 'clientes') renderClientes();
  if (id === 'pedidos') renderPedidos();
  if (id === 'artesas') renderMaoObra();
  if (id === 'financeiro') { initFinanceiro(); gerarFinanceiro(); }
  if (id === 'backup') { /* nada a renderizar */ }
  checkAlertas();
}

document.addEventListener('DOMContentLoaded', () => {
  DB.migrate();
  renderDashboard();
  checkAlertas();
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  });
});
