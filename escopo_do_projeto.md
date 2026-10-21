# Documento de Especificação de Escopo de Projeto
**Sistema de Gestão Comercial e Controle de Bordados Terceirizados**  
*Segmento: Selaria, Confecção Campeira e Artigos Personalizados*

---

## 1. Visão Geral e Justificativa

### 1.1 Contexto
Empresas do segmento de selaria, confecção campeira e moda country atuam prioritariamente com pedidos sob encomenda e customização (ex.: selas de couro gravadas com monograma, calças campeiras com brasão de haras, mantas bordadas). 

O processo tradicional enfrenta gargalos críticos:
* Falta de controle sobre quais peças estão nas oficinas de bordado parceiras.
* Risco frequente de atraso na entrega final ao cliente devido ao desconhecimento do prazo de retorno da terceirização.
* Perda de tempo no atendimento ao cliente (redigitação constante de dados cadastrais no balcão e no WhatsApp).
* Dificuldade de transformar propostas comerciais informais em pedidos faturados com rastreabilidade.

### 1.2 Objetivo do Projeto
Desenvolver uma solução web responsiva e ágil voltada para o operador de balcão e gerência, unificando:
1. Atendimento rápido com **autocomplete inteligente de clientes**.
2. Criação ágil de **orçamentos detalhados** com proposta em PDF e disparo com 1 clique para WhatsApp.
3. Conversão automática de orçamentos em **vendas/pedidos de produção**.
4. Rastreamento minucioso da **esteira de terceirização de bordados**, alertando sobre peças em atraso e permitindo cobrança direta do fornecedor via WhatsApp.
5. **Dashboard gerencial** com KPIs comerciais e volumetria de produção externa.

---

## 2. Perfis de Usuário (Personas)

| Perfil | Descrição | Principais Ações |
| :--- | :--- | :--- |
| **Operador de Balcão / Vendedor** | Responsável pelo atendimento direto ao cliente (presencial e via WhatsApp). | Cadastrar clientes, emitir orçamentos, disparar propostas no WhatsApp, lançar vendas diretas. |
| **Responsável de Expedição / Produção** | Controla as peças que saem para bordar e chegam das oficinas parceiras. | Enviar ordens para oficinas, registrar data prevista de retorno, cobrar fornecedores via WhatsApp, dar baixa na devolução. |
| **Gestor / Administrador** | Visualiza métricas gerais da empresa e gerencia cadastros de apoio. | Acompanhar faturamento no Dashboard, gerenciar catálogo de produtos base e oficinas credenciadas. |

---

## 3. Requisitos Funcionais (RF)

### 3.1 Módulo: Gestão e Busca Inteligente de Clientes
* **[RF001] Autocomplete em Tempo Real:** Nos formulários de venda ou orçamento, ao digitar 2 ou mais caracteres no campo "Nome", o sistema deve exibir dropdown com sugestões de clientes correspondentes por nome, WhatsApp ou CPF/CNPJ.
* **[RF002] Preenchimento Automático:** Ao selecionar um cliente na lista, os campos associados (*WhatsApp, Endereço de Entrega, Instagram e CPF/CNPJ*) devem ser preenchidos instantaneamente.
* **[RF003] Cadastro Transparente:** Se o operador digitar dados de um cliente novo durante a elaboração de um orçamento ou venda, o sistema deve registrar o novo cliente na base sem exigir saída da tela atual.
* **[RF004] Diretório de Clientes:** Listagem paginada/filtrável com acesso rápido ao histórico de compras e link direto para conversa no WhatsApp.

### 3.2 Módulo: Orçamentos Comerciais
* **[RF005] Composição Dinâmica de Itens:** Adicionar múltiplos itens ao orçamento, definindo quantidade, preço unitário do produto e subtotal.
* **[RF006] Configuração de Personalização/Bordado por Item:**
  * Opção de marcar se o item possui bordado.
  * Descrição detalhada da personalização (posição, cores de fio, matriz/arte).
  * Seleção da oficina parceira indicada.
  * Definição do custo interno do bordado vs. valor adicional cobrado do cliente.
  * Estimativa da data de retorno do fornecedor.
* **[RF007] Condições Comerciais:** Configurar forma de pagamento (Pix com desconto, parcelamento, etc.), previsão de entrega final e prazo de validade da proposta (dias).
* **[RF008] Emissão de Proposta Visual / PDF:** Geração de documento padronizado pronto para impressão ou download em PDF (estilizado em formato folha A4 com identidade visual da empresa).
* **[RF009] Envio Rápido para WhatsApp:** Botão com deep link (`https://wa.me/...`) contendo mensagem profissional pré-formatada com o resumo do orçamento e número de identificação.
* **[RF010] Conversão em Venda (1 Clique):** Botão que altera o status do orçamento para "Aprovado", gera um Pedido de Venda correspondente e despacha automaticamente os itens com personalização para a esteira de terceirização.

### 3.3 Módulo: Vendas Diretas e Pedidos
* **[RF011] Lançamento de Venda Direta:** Permitir criar pedidos fechados sem necessidade de passar pela etapa prévia de orçamento.
* **[RF012] Status do Pedido:** Rastreabilidade do ciclo do pedido (*Em Produção*, *Aguardando Bordado*, *Pronto para Entrega*, *Entregue / Concluído*).
* **[RF013] Impressão de Ficha de Produção:** Emissão de ficha técnica interna da venda para acompanhamento no chão de fábrica.

### 3.4 Módulo: Terceirização de Bordados (Esteira de Fornecedores)
* **[RF014] Geração Automática de Ordens de Serviço (OS):** Toda venda (convertida ou direta) que possua itens com personalização deve gerar registros individuais na esteira de terceirização.
* **[RF015] Painel de Prazos e Alertas:** Exibição clara de:
  * Peça e detalhe do bordado.
  * Fornecedor encarregado.
  * Data de envio e data prevista de retorno.
  * Sinalizador de alerta/atraso para itens cuja data de retorno expirou sem confirmação.
* **[RF016] Cobrança Rápida do Fornecedor via WhatsApp:** Botão dedicado que abre conversa com a oficina de bordado contendo mensagem pronta citando o número da OS, a peça e solicitando previsão de entrega.
* **[RF017] Baixa de Retorno:** Ação para registrar o retorno da peça finalizada. Se todas as peças de uma venda forem recebidas, o status da venda deve migrar automaticamente para *Pronto para Entrega*.

### 3.5 Módulo: Fornecedores / Oficinas de Bordado
* **[RF018] Cadastro de Oficinas:** Registro de nome fantasia, contato de WhatsApp, prazo médio contratual (em dias) e notas de especialidade técnica (ex.: couro grosso, chapéu, linha especial).
* **[RF019] Contador de Peças Ativas:** Visualização de quantas peças estão fisicamente alocadas em cada fornecedor no momento.

### 3.6 Módulo: Dashboard & Relatórios
* **[RF020] KPIs Principais:**
  * Faturamento total do mês.
  * Quantidade de pedidos fechados.
  * Orçamentos ativos e taxa percentual de conversão de propostas.
  * Peças atualmente em oficinas externas.
  * Alertas de bordados em atraso.
* **[RF021] Gráficos Interativos:**
  * Gráfico de barras de faturamento recente.
  * Gráfico de rosca com distribuição dos status dos bordados (*No Fornecedor*, *Recebidos*, *A Enviar*).
* **[RF022] Tabela de Retornos Críticos:** Exibição imediata na tela inicial das peças com retorno previsto para o dia ou em atraso.

---

## 4. Regras de Negócio (RN)

* **[RN001] Integridade do Endereço de Entrega:** O endereço do cliente gravado no orçamento ou na venda deve ser copiado como snapshot no momento da criação para que alterações cadastrais futuras do cliente não modifiquem o histórico de pedidos passados.
* **[RN002] Formação do Preço de Venda:** O valor total da peça personalizada deve corresponder a:  
  $$\text{Valor Total} = (\text{Preço Base da Peça} + \text{Adicional do Bordado}) \times \text{Quantidade}$$
* **[RN003] Regra de Despacho de Terceirização:** Peças em orçamentos **não** entram na esteira de terceirização. Somente após a aprovação do orçamento (ou lançamento de venda direta) a OS de bordado é efetivamente criada.
* **[RN004] Critério de Atraso:** Uma ordem de bordado é considerada "Em Atraso" quando a data atual for maior que a `data_previsao_retorno` e seu status for diferente de "Pronto / Recebido".
* **[RN005] Conclusão Automática da Produção:** Uma venda que depende de bordados só pode mudar para o status "Pronto para Entrega" quando 100% das ordens de bordado a ela associadas tiverem recebido baixa.

---

## 5. Requisitos Não-Funcionais (RNF)

* **[RNF001] Performance do Autocomplete:** As requisições de busca na digitação de clientes devem responder em menos de 250 milissegundos com suporte a debounce de 300ms.
* **[RNF002] Responsividade e Usabilidade Mobile:** A interface deve ser totalmente operável em smartphones e tablets, permitindo que o vendedor em trânsito (ex.: feiras agropecuárias, visitas a haras) consulte e emita propostas.
* **[RNF003] Otimização para Impressão:** Regras dedicadas de CSS `@media print` para garantir que o PDF/impressão remova menus laterais, botões e barras de navegação, entregando uma proposta visualmente limpa e alinhada à margem padrão A4.
* **[RNF004] Segurança e Privacidade:** Dados cadastrais (especialmente WhatsApp e CPF/CNPJ) devem ser manipulados em conformidade com as diretrizes da LGPD (Lei Geral de Proteção de Dados).

---

## 6. Modelo Conceitual de Dados

```text
+------------------+         1:N         +-------------------+
|     CLIENTES     |---------------------<|    ORÇAMENTOS     |
+------------------+                     +-------------------+
| id               |                     | id                |
| nome             |                     | cliente_id (FK)   |
| whatsapp         |                     | data_criacao      |
| endereco         |                     | validade_dias     |
| instagram        |                     | forma_pagamento   |
| documento        |                     | previsao_entrega  |
+------------------+                     | status            |
        | 1:N                            | total_geral       |
        |                                +-------------------+
        |                                          | 1:N
        |                                +-------------------+
        |                                | ITENS_ORCAMENTO   |
        |                                +-------------------+
        v                                | id                |
+------------------+         1:N         | orcamento_id (FK) |
|      VENDAS      |--------------------<| produto_nome      |
+------------------+                     | quantidade        |
| id               |                     | preco_unitario    |
| orcamento_id(FK) |                     | tem_bordado (bool)|
| cliente_id (FK)  |                     | bordado_detalhe   |
| data_venda       |                     | fornecedor_id(FK) |
| previsao_entrega |                     | custo_bordado     |
| status_producao  |                     | preco_bord_cliente|
| total_venda      |                     +-------------------+
+------------------+
        | 1:N
        |
        v
+------------------------+        N:1    +-------------------+
|    ORDENS_BORDADO      |>--------------|   FORNECEDORES    |
+------------------------+               +-------------------+
| id                     |               | id                |
| venda_id (FK)          |               | nome_oficina      |
| fornecedor_id (FK)     |               | whatsapp          |
| peca_descricao         |               | prazo_medio_dias  |
| detalhe_personalizacao |               | especialidade     |
| data_envio             |               +-------------------+
| previsao_retorno       |
| data_retorno_real      |
| custo_servico          |
| status_ordem           |
+------------------------+
```

---

## 7. Mensageria Padrão Integrada (WhatsApp)

### 7.1 Proposta de Orçamento para o Cliente
```text
Olá, [Nome do Cliente]! Tudo bem?

Segue a proposta comercial do seu orçamento #[ID_ORÇAMENTO] da Selaria & Arte:

• [Qtd]x [Produto 1] (Personalização: [Detalhe do Bordado])
• [Qtd]x [Produto 2]

Valor Total: R$ [Valor Total]
Previsão de Entrega: [Data Prevista]
Condições: [Forma de Pagamento]

O documento formal em PDF está anexo. Ficamos à disposição para confirmar o início da produção!
```

### 7.2 Cobrança de Retorno da Oficina Parceira
```text
Olá, [Nome da Oficina]! Tudo bem?

Gostaríamos de acompanhar a Ordem #[ID_ORDEM] referente ao nosso Pedido #[ID_VENDA]:
• Peça: [Descrição da Peça]
• Bordado: [Detalhes Técnicos]
• Prazo acordado de retorno: [Data Prevista de Retorno]

Conseguem nos confirmar se as peças já estão prontas para coleta? Obrigado!
```

---

## 8. Planejamento de Implementação (Roadmap)

```
[Fase 1: Fundação & Cadastros]
 ├── Autocomplete e CRUD de Clientes
 ├── Cadastro de Fornecedores e Catálogo de Produtos
 └── Layout Base e Navegação

[Fase 2: Motor Comercial & WhatsApp]
 ├── Elaboração de Orçamentos com Itens e Bordados
 ├── Gerador de PDF comercial limpo (Folha A4)
 ├── Integração com Links Dinâmicos de WhatsApp
 └── Mecanismo de Conversão de Orçamento em Pedido de Venda

[Fase 3: Terceirização & Chão de Fábrica]
 ├── Esteira de Ordens de Bordado
 ├── Alertas de Prazos e Disparador de Cobrança ao Fornecedor
 └── Baixa de Retorno e Atualização Automática de Status da Venda

[Fase 4: Dashboard & Inteligência Operacional]
 ├── Gráficos de Vendas e Status de Bordados
 ├── KPIs de Conversão e Retenção
 └── Refinamento de Usabilidade Mobile e Homologação
```

---

## 9. Critérios de Aceite para Entrega

1. **Eficiência no Atendimento:** O operador deve conseguir preencher um orçamento para cliente já existente em menos de 60 segundos utilizando a busca inteligente.
2. **Zero Digitação Redundante:** Nenhum dado deve ser digitado novamente na transição entre *Orçamento* $\rightarrow$ *Venda* $\rightarrow$ *Ordem de Bordado*.
3. **Visibilidade de Prazos:** A lista de bordados deve destacar em cor vermelha e com badge de alerta toda peça que ultrapassar a data combinada com a oficina de bordado.
4. **Comunicação Instantânea:** Tanto a proposta para o cliente quanto a cobrança para o bordadeiro devem ser acionadas com apenas 1 clique a partir do sistema.