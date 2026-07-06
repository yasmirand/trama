/* =====================================================
   BACKUP — exporta/importa TODAS as chaves (antigas + novas)
   ===================================================== */

function exportarBackup() {
  const dados = {};
  DB.KEYS.forEach(k => { dados[k] = DB.get(k); });
  dados.config = DB.getConfig();
  dados._exportado = new Date().toISOString();
  dados._versao = 3; // v3 = inclui config (nome do ateliê para o recibo)
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'atelie-backup-' + today() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup exportado!', 'success');
}

function importarBackup() {
  const file = document.getElementById('backupFile').files[0];
  if (!file) { toast('Selecione um arquivo .json', 'error'); return; }
  if (!confirm('Isso substituirá TODOS os dados atuais. Continuar?')) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const dados = JSON.parse(e.target.result);
      // Só grava as chaves presentes no arquivo — chaves ausentes (backup antigo)
      // permanecem intactas e depois são inicializadas/migradas pelo DB.migrate().
      DB.KEYS.forEach(k => { if (dados[k]) DB.set(k, dados[k]); else if (localStorage.getItem('atelie_' + k) === null) DB.set(k, []); });
      if (dados.config) DB.setConfig(dados.config);
      DB.migrate();
      toast('Backup restaurado com sucesso!', 'success');
      showTab('dashboard');
    } catch {
      toast('Arquivo inválido!', 'error');
    }
  };
  reader.readAsText(file);
}

function limparDados() {
  if (!confirm('ATENÇÃO: isso apaga todos os dados permanentemente. Tem certeza?')) return;
  if (!confirm('Segunda confirmação: apagar tudo mesmo?')) return;
  DB.KEYS.forEach(k => localStorage.removeItem('atelie_' + k));
  DB.migrate();
  toast('Dados apagados', '');
  showTab('dashboard');
}
