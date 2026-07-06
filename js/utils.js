/* =====================================================
   UTILS — helpers compartilhados
   ===================================================== */

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function fmt(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }); }
function fmtN(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(d) { if (!d) return '—'; const [a, m, dia] = d.split('-'); return `${dia}/${m}/${a}`; }
function today() { return new Date().toISOString().slice(0, 10); }
function mesAno(d) { if (!d) return ''; const p = d.split('-'); return p[0] + '-' + p[1]; }
function nomeMes(i) { return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][i] || ''; }

function toast(msg, tipo = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + tipo;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = '', 2500);
}

function fecharModal(id) { document.getElementById(id).classList.remove('open'); }
function abrirModal(id) { document.getElementById(id).classList.add('open'); }

/** Normaliza texto para busca (remove acentos, minúsculas) */
function normaliza(s) {
  return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Retorna os últimos N meses (mais antigo -> mais recente) no formato {key:'YYYY-MM', label:'Mmm/AA'} */
function ultimosMeses(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const label = nomeMes(d.getMonth()).slice(0, 3) + '/' + String(d.getFullYear()).slice(2);
    out.push({ key, label });
  }
  return out;
}
