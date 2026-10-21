# 🏇 Selaria ProHorse - Sistema de Gestão Comercial e Controle de Bordados

Sistema web full-stack desenvolvido especificamente para selarias, confecções campeiras e moda country, com foco em atendimento de balcão ágil, personalização de bordados sob encomenda e rastreamento minucioso de oficinas terceirizadas.

---

## 🌟 Principais Recursos Implementados

1. **Autenticação & Perfis de Acesso**:
   - Tela de login profissional com a logo vetorial da **Selaria ProHorse**.
   - Suporte aos 3 perfis do escopo: *Operador de Balcão / Vendedor*, *Responsável de Expedição / Produção* e *Gestor / Administrador*.
   - Acesso rápido por perfil para homologação e testes.

2. **Gestão e Busca Inteligente de Clientes (RF001 - RF004)**:
   - **Autocomplete em Tempo Real (<250ms com debounce de 300ms)**: busca instantânea por nome, WhatsApp ou CPF/CNPJ.
   - **Preenchimento Automático**: dados cadastrais e endereço preenchidos ao selecionar o cliente.
   - **Cadastro Transparente (Inline)**: registro automático de novos clientes sem sair do formulário de orçamento.
   - **Diretório de Clientes**: listagem com histórico de compras, ticket total e link direto para WhatsApp com 1 clique.

3. **Orçamentos Comerciais & Propostas (RF005 - RF010)**:
   - Composição dinâmica de itens com cálculo em tempo real: `(Preço Base + Adicional Bordado) * Quantidade`.
   - **Múltiplas Formas e Datas de Pagamento**: botão para adicionar quantas parcelas/formas desejar (ex.: Pix no ato + Boletos agendados para datas futuras, Cartão + Dinheiro, etc.).
   - Atribuição de oficina parceira para confecção da peça e/ou bordado com seleção opcional de prazo.
   - **Visualização em Folha A4 / Impressão e PDF**: layout pronto para impressão (`@media print`) com plano de pagamento e identidade visual.
   - **Disparo no WhatsApp com 1 Clique**: mensagem padronizada profissional com resumo do orçamento e condições detalhadas de pagamento.
   - **Conversão em Venda (1 Clique)**: aprova a proposta, gera o Pedido de Venda e despacha automaticamente as peças e bordados para a Esteira.

4. **Vendas Diretas & Chão de Fábrica (RF011 - RF013)**:
   - Lançamento de venda direta com suporte a multi-pagamentos e oficinas parceiras.
   - Rastreabilidade de ciclo: *Em Produção*, *Aguardando Bordado*, *Pronto para Entrega*, *Entregue / Concluído*.
   - **Ficha Técnica de Produção**: documento técnico interno para acompanhamento no chão de fábrica.

5. **Esteira de Produção & Terceirização (RF014 - RF017, RN004, RN005)**:
   - Geração automática de Ordens de Serviço (OS) para peças confeccionadas por oficinas parceiras (ex: selas sob encomenda) e personalizações/bordados.
   - **Controle Flexível de Prazos**: possibilidade de definir ou não prazo de retorno para cada item.
   - **Painel de Prazos & Alertas**: sinalizador e badge pulsante em vermelho para itens com prazo expirado.
   - **Cobrança Rápida via WhatsApp**: botão dedicado com mensagem adaptada para fabricação de peça ou bordado.
   - **Baixa de Retorno & Conclusão Automática**: botão de baixa na Esteira que, ao concluir todas as ordens de uma venda, atualiza o pedido automaticamente para *Pronto para Entrega*.

6. **Oficinas & Fornecedores (RF018 - RF019)**:
   - Cadastro de oficinas com prazo médio e especialidade técnica (ex.: couro grosso, chapéu, mantas).
   - Contador em tempo real de peças fisicamente alocadas e peças em atraso por oficina.

7. **Dashboard Gerencial & KPIs (RF020 - RF022)**:
   - KPIs de faturamento mensal, taxa de conversão de orçamentos, peças no fornecedor e alertas de atraso.
   - Gráficos de distribuição e fluxo de produção.
   - Tabela prioritária de retornos críticos (atrasados e vencendo hoje).

8. **Design & Responsividade Mobile**:
   - Design System em Vanilla CSS, combinando tons escuros nobres (slate/obsidian) e detalhes em couro e ouro nobre.
   - Navegação inferior nativa para celulares (*Bottom Navigation Bar*) com botão de ação rápida central.
   - Logo vetorial SVG adaptativa (`currentColor`), exibindo em branco em fundos escuros e em tinta preta nos documentos impressos A4.

---

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos
- Node.js (versão 18 ou superior)
- npm

### 2. Instalar dependências (caso não tenha instalado)
```bash
npm install
```

### 3. Rodar em Modo de Desenvolvimento (Hot-reload Frontend + API)
```bash
npm run dev
```
- O servidor Express iniciará na porta `3001`.
- O Vite iniciará o frontend com proxy na porta `5173`.
- Acesse: `http://localhost:5173` ou `http://localhost:3001`

---

## 🌐 Como Rodar na VPS (Produção)

O sistema foi preparado para rodar de forma independente em qualquer VPS (Ubuntu, Debian, CentOS ou Windows Server):

### Passo 1: Gerar o bundle de produção
```bash
npm run build
```

### Passo 2: Iniciar a aplicação
```bash
npm start
```
Por padrão, o servidor rodará na porta `3001` (ou na porta definida pela variável de ambiente `PORT`).

### Passo 3: Rodar com PM2 (Recomendado para VPS)
Para manter o sistema rodando continuamente em segundo plano e reiniciando em caso de reinicialização da VPS:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicação ProHorse
pm2 start server/index.js --name "prohorse"

# Salvar configuração para iniciar no boot da VPS
pm2 save
pm2 startup
```

### Exemplo de Configuração de Reverse Proxy Nginx (opcional):
```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🗄️ Estrutura do Projeto

```
prohorse/
├── server/
│   ├── db.js             # Banco SQLite com schema completo e seed inicial
│   ├── index.js          # API REST Express (Auth, Clientes, Orçamentos, Vendas, Bordados, KPIs)
│   └── prohorse.db       # Arquivo do banco de dados SQLite persistente
├── src/
│   ├── components/
│   │   ├── ProHorseLogo.jsx              # Componente SVG da Logo Oficial ProHorse
│   │   ├── LoginScreen.jsx               # Tela de Login com atalhos de personas
│   │   ├── DashboardView.jsx             # Dashboard Gerencial com KPIs e Alertas
│   │   ├── NovoOrcamentoModal.jsx        # Formulário com Autocomplete e Itens de Bordado
│   │   ├── VisualizacaoPropostaModal.jsx # Proposta A4 impressa e envio WhatsApp (7.1)
│   │   ├── FichaProducaoModal.jsx        # Ficha Técnica de Chão de Fábrica (RF013)
│   │   ├── OrcamentosView.jsx            # Gestão de Orçamentos e Conversão em Venda
│   │   ├── VendasView.jsx                # Gestão de Pedidos e Ciclo de Produção
│   │   ├── BordadosView.jsx              # Esteira de Bordados e Cobrança WhatsApp (7.2)
│   │   ├── FornecedoresView.jsx          # Cadastro de Oficinas e Contadores Ativos
│   │   └── ClientesView.jsx              # Diretório de Clientes e Histórico
│   ├── App.jsx           # Layout principal, Topbar, Sidebar e Mobile Bottom Nav
│   ├── main.jsx          # Entrypoint React
│   └── index.css         # Design System completo em Vanilla CSS
├── public/
│   ├── logo.svg          # Logo estática
│   └── favicon.svg       # Favicon
├── LOGO SELARIA PROHORSE.svg # Arquivo original da logo na raiz
├── escopo_do_projeto.md      # Especificação completa do escopo
└── package.json
```

---

## 👥 Credenciais de Teste

| Perfil | E-mail | Senha |
|---|---|---|
| **Vendedor / Operador de Balcão** | `vendedor@prohorse.com.br` | `123456` |
| **Expedição / Produção** | `producao@prohorse.com.br` | `123456` |
| **Gestor / Administrador** | `admin@prohorse.com.br` | `123456` |
