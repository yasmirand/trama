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
    'vendas', 'produtos', 'horas',                                // antigas (legado, não usadas na UI nova)
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

    // 4) categoriza despesas antigas (sem o campo "categ").
    //    Se a descrição já mencionar "brinde" ou "sorteio", categoriza automaticamente.
    const despesasCateg = this.get('despesas').map(d => {
      if (d.categ) return d;
      const desc = normaliza(d.desc || '');
      let categ = 'outras';
      if (desc.includes('sorteio')) categ = 'sorteios';
      else if (desc.includes('brinde')) categ = 'brindes';
      return { ...d, categ };
    });

    // 5) migra "vendas" (sistema antigo, pré-"Pedidos") -> "pedidos" (novo)
    //    só roda se ainda não existir nenhum pedido, para não duplicar.
    //    Vendas cujo produto não bate com nenhuma pulseira cadastrada ganham
    //    uma pulseira "esboço" automaticamente, para não perder o histórico.
    //    Vendas que na verdade eram brinde/sorteio (registradas manualmente como
    //    venda + uma despesa avulsa com mesma data/valor no sistema antigo) são
    //    detectadas e fundidas num único pedido do tipo certo, sem gerar receita
    //    nem duplicar a despesa.
    const pedidos = this.get('pedidos');
    const vendasLegado = this.get('vendas');
    let despesasFinal = despesasCateg;
    if (pedidos.length === 0 && vendasLegado.length > 0) {
      const pulseirasAtuais = this.get('pulseiras');
      const despesasRestantes = [...despesasCateg];

      const pedidosMigrados = vendasLegado.map(v => {
        const nomeProduto = v.produto || 'Produto (venda antiga)';
        const chave = normaliza(nomeProduto);
        let pulseira = pulseirasAtuais.find(p => normaliza(p.nome) === chave);
        if (!pulseira) {
          pulseira = {
            id: uid(), nome: nomeProduto, precoPadrao: v.valorUnit || 0, custoMedio: 0,
            tempoMedio: 0, estoque: 0, vendidas: 0, brindes: 0, sorteios: 0,
            unidadesProduzidas: 0, materiais: [], criadoEm: v.data || today()
          };
          pulseirasAtuais.push(pulseira);
        }

        const total = v.total || 0;
        // procura uma despesa de brinde/sorteio com a mesma data e o mesmo valor
        const despesaIdx = despesasRestantes.findIndex(d =>
          (d.categ === 'brindes' || d.categ === 'sorteios') &&
          d.data === v.data && Math.abs((d.valor || 0) - total) < 0.01
        );

        if (despesaIdx >= 0) {
          const despesa = despesasRestantes[despesaIdx];
          despesasRestantes.splice(despesaIdx, 1); // a despesa avulsa vira parte do pedido, não duplica
          const tipoPedido = despesa.categ === 'brindes' ? 'brinde' : 'sorteio';
          if (tipoPedido === 'brinde') pulseira.brindes = (pulseira.brindes || 0) + (v.qtd || 0);
          else pulseira.sorteios = (pulseira.sorteios || 0) + (v.qtd || 0);
          return {
            id: v.id || uid(), clienteId: v.clienteId || '', cliente: v.cliente || '',
            pulseiraId: pulseira.id, pulseira: pulseira.nome,
            tipo: tipoPedido, qtd: v.qtd || 0, precoPadrao: pulseira.precoPadrao,
            precoUnit: 0, total: 0,
            formaPagamento: '', valorPago: 0, valorRestante: 0, custoTotal: despesa.valor || 0,
            obs: v.obs || '', status: 'entregue', dataConclusao: v.data || today(),
            data: v.data || today()
          };
        }

        // venda normal
        pulseira.vendidas = (pulseira.vendidas || 0) + (v.qtd || 0);
        const totalPendente = v.totalPendente || 0;
        const valorPago = Math.max(total - totalPendente, 0);
        return {
          id: v.id || uid(), clienteId: v.clienteId || '', cliente: v.cliente || '',
          pulseiraId: pulseira.id, pulseira: pulseira.nome,
          tipo: 'venda', qtd: v.qtd || 0, precoPadrao: pulseira.precoPadrao,
          precoUnit: v.valorUnit || 0, total,
          formaPagamento: '', valorPago, valorRestante: totalPendente, custoTotal: 0,
          obs: v.obs || '', status: 'entregue', dataConclusao: v.data || today(),
          data: v.data || today()
        };
      });

      this.set('pulseiras', pulseirasAtuais);
      this.set('pedidos', pedidosMigrados);
      despesasFinal = despesasRestantes;
      toastSeguro('Vendas antigas migradas para "Pedidos".');
    }
    this.set('despesas', despesasFinal);

    // 6) garante campos novos em artesãs (produção automática)
    const artesas = this.get('artesas').map(a => ({ totalProduzido: 0, totalRecebido: 0, ultimaProducao: null, ...a }));
    this.set('artesas', artesas);
  }
};

/** toast só funciona depois que o DOM existe; protege chamadas muito cedo */
function toastSeguro(msg, tipo = '') {
  if (document.getElementById('toast')) toast(msg, tipo);
}
