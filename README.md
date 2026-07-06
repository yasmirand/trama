# ✨ Sistema de Gestão - Trama

Sistema desenvolvido para gerenciar a produção, estoque, pedidos e financeiro da **Trama**, uma empresa de pulseiras artesanais.

O objetivo é facilitar o controle completo do negócio, desde a compra dos materiais até a entrega dos pedidos, mantendo o financeiro sempre organizado.

---

# 🚀 Funcionalidades

## 📊 Dashboard

Painel com indicadores gerais da empresa.

* Receita do mês
* Lucro do mês
* Total de pedidos
* Pulseiras em estoque
* Gráfico de faturamento/lucro por mês
* Pulseiras mais vendidas
* Materiais com estoque baixo
* Pedidos pendentes

---

## 🛍️ Pulseiras

Cadastro dos modelos de pulseiras.

Cada modelo possui:

* Nome
* Preço padrão
* Custo médio
* Lucro estimado
* Tempo médio de produção
* Quantidade em estoque
* Quantidade vendida
* Quantidade utilizada em brindes
* Quantidade utilizada em sorteios

Também permite:

* Editar pulseira
* Produzir novas unidades
* Visualizar histórico

Durante a produção, o sistema:

* recalcula automaticamente o custo utilizando os preços atuais dos materiais;
* calcula automaticamente o custo da mão de obra;
* atualiza o custo médio da pulseira;
* aumenta o estoque;
* registra os custos no financeiro.

---

## 🧮 Calculadora

Ferramenta para criação de novos modelos.

Calcula automaticamente:

* Custo dos materiais
* Mão de obra
* Custo total
* Margem de lucro
* Preço sugerido

O preço sugerido pode ser alterado manualmente antes de salvar.

Após salvar, a pulseira passa a fazer parte do catálogo de modelos.

---

## 📦 Materiais

Controle completo dos materiais utilizados.

* Cadastro
* Entrada
* Saída
* Pesquisa de materiais
* Histórico de movimentações

Os materiais são descontados automaticamente sempre que uma produção é registrada.

---

## 👥 Clientes

Cadastro e gerenciamento dos clientes.

---

## 📋 Pedidos

Controle completo dos pedidos.

Cada pedido possui:

* Cliente
* Pulseira
* Quantidade
* Tipo do pedido
* Preço unitário
* Valor total
* Valor pago
* Valor a receber
* Forma de pagamento
* Data
* Status
* Observações

### Tipos de pedido

* Venda
* Brinde
* Prêmio de sorteio

### Funcionamento

**Venda**

* Gera receita.
* Atualiza o financeiro.
* Atualiza as vendas da pulseira.

**Brinde**

* Consome estoque.
* Não gera receita.
* Registra o custo como despesa de brindes.

**Prêmio de sorteio**

* Consome estoque.
* Não gera receita.
* Registra o custo como despesa de sorteios.

O sistema permite editar o preço da pulseira diretamente no pedido sem alterar o preço padrão cadastrado.

Também impede a criação de pedidos quando não houver estoque suficiente.

---

## 📄 Recibos

A geração de recibos está integrada aos pedidos.

Quando um pedido estiver com status **Entregue**, é possível:

* Visualizar o recibo
* Imprimir o recibo

O recibo utiliza automaticamente o nome da empresa:

**Trama**

---

## 👩 Artesãs

Cadastro das artesãs.

Cada artesã possui:

* Nome
* Valor por minuto

O sistema calcula automaticamente:

* Quantidade produzida
* Valor recebido
* Última produção

Não é necessário registrar horas manualmente.

---

## 💰 Financeiro

Controle financeiro completo da empresa.

* Receitas
* Gastos com materiais
* Mão de obra
* Brindes
* Sorteios
* Lucro
* Gráficos mensais
* Produtos mais vendidos
* Produtos mais lucrativos

---

## 💾 Backup

Sistema completo de backup.

Permite:

* Exportar todos os dados
* Importar backups anteriores

O formato do backup permanece compatível com versões antigas do sistema, realizando migração automática quando necessário.

---

# 🧠 Objetivo

Centralizar toda a gestão da empresa em um único sistema, permitindo controlar:

* Produção
* Estoque
* Pedidos
* Clientes
* Financeiro
* Custos
* Lucro

Tudo de forma simples e organizada.

---

# 🛠️ Tecnologias Utilizadas

* HTML
* CSS
* JavaScript
* LocalStorage

---

# ▶️ Fluxo de utilização

1. Cadastrar materiais
2. Criar um modelo utilizando a Calculadora
3. Produzir pulseiras
4. Registrar pedidos
5. Gerar recibos quando necessário
6. Acompanhar o financeiro e os indicadores pelo Dashboard

---

# 📱 Interface

* Interface simples e intuitiva
* Layout responsivo
* Navegação organizada por módulos

---

# 📌 Observações

* Sistema desenvolvido para uso local.
* Não requer conexão com a internet.
* Os dados são armazenados no navegador utilizando LocalStorage.
* Recomenda-se realizar backups periódicos para evitar perda de dados.

---

# 💡 Autor

Projeto desenvolvido para auxiliar a gestão da **Trama**, automatizando o controle de produção, estoque, pedidos e financeiro de uma empresa artesanal de pulseiras.
