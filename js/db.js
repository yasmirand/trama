/* =====================================================
   DB — camada de armazenamento (localStorage)
   =====================================================
   Mantém o MESMO prefixo ('atelie_') e as MESMAS chaves antigas
   para garantir compatibilidade total com backups anteriores.
   Novas chaves são adicionadas sem remover/renomear as antigas.
*/

const DB = {
  // chaves antigas (mantidas por compatibilidade) + novas chaves
  KEYS: [
    'clientes', 'materiais', 'movimentos', 'artesas', 'despesas', // antigas
    'vendas', 'produtos',                                        // antigas (legado, não usadas na UI nova)
    'pulseiras', 'producoes', 'pedidos'                           // novas
  ],

  get(key) { try { return JSON.parse(localStorage.getItem('atelie_' + key)) || []; } catch { return []; } },
  set(key, val) { localStorage.setItem('atelie_' + key, JSON.stringify(val)); },
  getObj(key, def = {}) { try { return JSON.parse(localStorage.getItem('atelie_' + key)) || def; } catch { return def; } },
  setObj(key, val) { localStorage.setItem('atelie_' + key, JSON.stringify(val)); },

  /** Configurações gerais do sistema (objeto, não lista) — ex: nome do ateliê usado no recibo.
   *  Fica fora do array KEYS (que é só de listas), mas é incluída no backup manualmente. */
  CONFIG_KEY: 'config',
  getConfig() { return this.getObj(this.CONFIG_KEY, {}); },
  setConfig(obj) { this.setObj(this.CONFIG_KEY, obj); },

  /**
   * Garante que todas as chaves existam e migra dados do formato antigo
   * para o novo, sem apagar nada. Chamado uma vez na inicialização e
   * também depois de importar um backup antigo.
   */
  migrate() {
    // 1) garante existência de todas as chaves (arrays vazios se ausentes)
    this.KEYS.forEach(k => {
      if (localStorage.getItem('atelie_' + k) === null) this.set(k, []);
    });

    // 2) migra "produtos" (calculadora antiga) -> "pulseiras" (catálogo novo)
    //    só roda se ainda não existir nenhuma pulseira, para não duplicar
    const pulseiras = this.get('pulseiras');
    const produtosLegado = this.get('produtos');
    if (pulseiras.length === 0 && produtosLegado.length > 0) {
      const migradas = produtosLegado.map(p => ({
        id: p.id || uid(),
        nome: p.nome,
        precoPadrao: p.sugerido || p.custoTotal || 0,
        custoMedio: p.custoTotal || 0,
        tempoMedio: p.minutos || 0,
        estoque: 0,
        vendidas: 0,
        unidadesProduzidas: 0,
        materiais: (p.itens || []).map(i => ({ materialId: i.materialId, qtd: i.qtd })),
        criadoEm: p.data || today()
      }));
      this.set('pulseiras', migradas);
      toastSeguro('Modelos antigos da calculadora migrados para "Pulseiras".');
    }

    // 3) garante campos novos em registros de pulseiras que vieram de backups antigos
    const pulseirasAtualizadas = this.get('pulseiras').map(p => ({
      estoque: 0, vendidas: 0, brindes: 0, sorteios: 0, unidadesProduzidas: 0, materiais: [], tempoMedio: 0, custoMedio: 0, precoPadrao: 0,
      ...p
    }));
    this.set('pulseiras', pulseirasAtualizadas);

    // 4) garante campos novos em artesãs (produção automática)
    const artesas = this.get('artesas').map(a => ({ totalProduzido: 0, totalRecebido: 0, ultimaProducao: null, ...a }));
    this.set('artesas', artesas);
  }
};

/** toast só funciona depois que o DOM existe; protege chamadas muito cedo */
function toastSeguro(msg, tipo = '') {
  if (document.getElementById('toast')) toast(msg, tipo);
}
