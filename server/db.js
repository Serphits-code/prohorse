const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'prohorse.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      cargo TEXT NOT NULL, -- 'Vendedor / Balcão', 'Expedição / Produção', 'Gestor / Administrador'
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      endereco TEXT,
      instagram TEXT,
      documento TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fornecedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_oficina TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      prazo_medio_dias INTEGER DEFAULT 3,
      especialidade TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS produtos_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT,
      preco_sugerido REAL NOT NULL,
      descricao TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orcamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      cliente_nome_snap TEXT NOT NULL,
      cliente_whatsapp_snap TEXT,
      cliente_endereco_snap TEXT,
      cliente_doc_snap TEXT,
      cliente_instagram_snap TEXT,
      data_criacao DATE NOT NULL,
      validade_dias INTEGER DEFAULT 10,
      forma_pagamento TEXT,
      previsao_entrega DATE,
      status TEXT DEFAULT 'Pendente', -- 'Pendente', 'Aprovado', 'Recusado'
      total_geral REAL NOT NULL DEFAULT 0,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS itens_orcamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orcamento_id INTEGER NOT NULL,
      produto_nome TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 1,
      preco_unitario REAL NOT NULL DEFAULT 0,
      tem_bordado INTEGER DEFAULT 0,
      bordado_detalhe TEXT,
      fornecedor_id INTEGER,
      custo_bordado REAL DEFAULT 0,
      preco_bord_cliente REAL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
      FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orcamento_id INTEGER,
      cliente_id INTEGER,
      cliente_nome_snap TEXT NOT NULL,
      cliente_whatsapp_snap TEXT,
      cliente_endereco_snap TEXT,
      cliente_doc_snap TEXT,
      data_venda DATE NOT NULL,
      previsao_entrega DATE,
      status_producao TEXT DEFAULT 'Em Produção', -- 'Em Produção', 'Aguardando Bordado', 'Pronto para Entrega', 'Entregue / Concluído'
      total_venda REAL NOT NULL DEFAULT 0,
      forma_pagamento TEXT,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE SET NULL,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS itens_venda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER NOT NULL,
      produto_nome TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 1,
      preco_unitario REAL NOT NULL DEFAULT 0,
      tem_bordado INTEGER DEFAULT 0,
      bordado_detalhe TEXT,
      fornecedor_id INTEGER,
      custo_bordado REAL DEFAULT 0,
      preco_bord_cliente REAL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
      FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ordens_bordado (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER NOT NULL,
      item_venda_id INTEGER,
      fornecedor_id INTEGER NOT NULL,
      peca_descricao TEXT NOT NULL,
      detalhe_personalizacao TEXT,
      data_envio DATE NOT NULL,
      previsao_retorno DATE NOT NULL,
      data_retorno_real DATE,
      custo_servico REAL DEFAULT 0,
      status_ordem TEXT DEFAULT 'No Fornecedor', -- 'No Fornecedor', 'Pronto / Recebido'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
      FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE RESTRICT
    );
  `);

  // Migrações seguras de schema se as colunas ainda não existirem
  try { db.exec(`ALTER TABLE orcamentos ADD COLUMN condicoes_pagamento_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE vendas ADD COLUMN condicoes_pagamento_json TEXT;`); } catch (e) {}

  try { db.exec(`ALTER TABLE itens_orcamento ADD COLUMN previsao_retorno_bordado DATE;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_orcamento ADD COLUMN oficina_produto_id INTEGER;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_orcamento ADD COLUMN tem_prazo_produto INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_orcamento ADD COLUMN previsao_retorno_produto DATE;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_orcamento ADD COLUMN custo_produto_fornecedor REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_orcamento ADD COLUMN tem_prazo_bordado INTEGER DEFAULT 1;`); } catch (e) {}

  try { db.exec(`ALTER TABLE itens_venda ADD COLUMN previsao_retorno_bordado DATE;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_venda ADD COLUMN oficina_produto_id INTEGER;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_venda ADD COLUMN tem_prazo_produto INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_venda ADD COLUMN previsao_retorno_produto DATE;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_venda ADD COLUMN custo_produto_fornecedor REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_venda ADD COLUMN tem_prazo_bordado INTEGER DEFAULT 1;`); } catch (e) {}

  try { db.exec(`ALTER TABLE ordens_bordado ADD COLUMN tipo_servico TEXT DEFAULT 'Bordado';`); } catch (e) {}
  try { db.exec(`ALTER TABLE ordens_bordado ADD COLUMN tem_prazo INTEGER DEFAULT 1;`); } catch (e) {}

  // Migrações seguras para Custo e Lucro (Preço de Custo vs Preço de Venda)
  try { db.exec(`ALTER TABLE orcamentos ADD COLUMN custo_total REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE orcamentos ADD COLUMN lucro_total REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE vendas ADD COLUMN custo_total REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE vendas ADD COLUMN lucro_total REAL DEFAULT 0;`); } catch (e) {}

  try { db.exec(`ALTER TABLE itens_orcamento ADD COLUMN preco_custo REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_orcamento ADD COLUMN tipo_item TEXT DEFAULT 'sob_encomenda';`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_venda ADD COLUMN preco_custo REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE itens_venda ADD COLUMN tipo_item TEXT DEFAULT 'sob_encomenda';`); } catch (e) {}

  try { db.exec(`ALTER TABLE produtos_base ADD COLUMN preco_custo REAL DEFAULT 0;`); } catch (e) {}

  // Seed default data if empty
  seedData();
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count;
  if (userCount > 0) return;

  console.log('🌱 Inicializando usuário administrador de produção...');

  const insertUser = db.prepare(`
    INSERT INTO usuarios (nome, email, senha, cargo, avatar)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertUser.run(
    'Administrador',
    'almeidaestudios@outlook.com',
    'Cxz963!@',
    'Gestor / Administrador',
    'AS'
  );

  console.log('✅ Banco de dados ProHorse pronto para produção!');
}

initDb();

module.exports = db;
