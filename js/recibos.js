/* =====================================================
   RECIBOS — integrado ao módulo Pedidos
   =====================================================
   Adaptado do sistema de recibos original (que trabalhava em
   cima de "vendas"). Mantém as mesmas funções (gerarHTMLRecibo,
   previewRecibo, gerarRecibo), agora operando sobre um Pedido.
   Só é possível gerar recibo de pedidos com status "Entregue".
*/

/** Nome do ateliê/empresa é salvo em DB.config para lembrar entre sessões */
function getReciboEmpresa() {
  return DB.getConfig().reciboEmpresa || 'Trama';
}
function salvarReciboEmpresa(nome) {
  const cfg = DB.getConfig();
  cfg.reciboEmpresa = nome;
  DB.setConfig(cfg);
}

/** Abre o modal de recibo para um pedido específico (chamado pelo botão "📄 Gerar recibo") */
function abrirRecibo(pedidoId) {
  const p = DB.get('pedidos').find(x => x.id === pedidoId);
  if (!p) return;
  if (p.status !== 'entregue') { toast('Só é possível gerar recibo de pedidos entregues', 'error'); return; }
  document.getElementById('reciboPedidoId').value = pedidoId;
  document.getElementById('reciboEmpresaInput').value = getReciboEmpresa();
  previewRecibo();
  abrirModal('modalRecibo');
}

/** Recalcula a pré-visualização (chamado ao abrir e ao editar o nome da empresa) */
function previewRecibo() {
  const id = document.getElementById('reciboPedidoId').value;
  const p = DB.get('pedidos').find(x => x.id === id);
  if (!p) return;
  const empresa = document.getElementById('reciboEmpresaInput').value || 'Trama';
  document.getElementById('reciboPreview').innerHTML = gerarHTMLRecibo(p, empresa);
}

/** Monta o HTML do recibo a partir dos dados do PEDIDO (antes era a venda) */
function gerarHTMLRecibo(p, empresa) {
  return `
    <div class="recibo-header">
      <h2>${empresa}</h2>
      <p>Recibo de pagamento</p>
    </div>
    <div class="recibo-row"><span>Cliente</span><strong>${p.cliente || 'Não informado'}</strong></div>
    <div class="recibo-row"><span>Pulseira</span><strong>${p.pulseira}</strong></div>
    <div class="recibo-row"><span>Quantidade</span><strong>${p.qtd}</strong></div>
    <div class="recibo-row"><span>Valor unitário</span><strong>R$ ${fmtN(p.precoUnit)}</strong></div>
    <div class="recibo-row"><span>Data</span><strong>${fmtDate(p.data)}</strong></div>
    <div class="recibo-row"><span>Forma de pagamento</span><strong>${p.formaPagamento || '—'}</strong></div>
    ${p.obs ? `<div class="recibo-row"><span>Obs.</span><strong>${p.obs}</strong></div>` : ''}
    <div class="recibo-total">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">VALOR TOTAL</div>
      <div class="val">R$ ${fmtN(p.total)}</div>
    </div>
    <div class="recibo-assinatura">
      <div class="linha">${empresa}<br>Assinatura</div>
    </div>
    <div class="recibo-footer">
      Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${empresa}
    </div>
  `;
}

/** Confirma nome da empresa, atualiza a prévia e dispara a impressão */
function gerarRecibo() {
  const empresa = document.getElementById('reciboEmpresaInput').value.trim();
  if (empresa) salvarReciboEmpresa(empresa);
  previewRecibo();
  setTimeout(() => window.print(), 250);
}
