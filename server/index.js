const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static assets if in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Helper: current ISO date
function getTodayIso() {
  return new Date().toISOString().split('T')[0];
}

// -----------------------------------------------------------------------------
// 1. AUTENTICAÇÃO E USUÁRIOS
// -----------------------------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const user = db.prepare('SELECT id, nome, email, cargo, avatar FROM usuarios WHERE email = ? AND senha = ?').get(email, senha);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
  }

  res.json({
    user,
    token: 'mock-jwt-token-' + user.id + '-' + Date.now()
  });
});

app.get('/api/usuarios', (req, res) => {
  const users = db.prepare('SELECT id, nome, email, cargo, avatar FROM usuarios').all();
  res.json(users);
});

// -----------------------------------------------------------------------------
// 2. CLIENTES (RF001, RF002, RF003, RF004)
// -----------------------------------------------------------------------------
// RF001: Autocomplete em Tempo Real (<250ms)
app.get('/api/clientes/busca', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    return res.json([]);
  }

  const query = `%${q}%`;
  const clientes = db.prepare(`
    SELECT id, nome, whatsapp, endereco, instagram, documento
    FROM clientes
    WHERE nome LIKE ? OR whatsapp LIKE ? OR documento LIKE ?
    ORDER BY nome ASC
    LIMIT 10
  `).all(query, query, query);

  res.json(clientes);
});

// RF004: Diretório de Clientes com histórico
app.get('/api/clientes', (req, res) => {
  const clientes = db.prepare(`
    SELECT 
      c.*,
      COUNT(DISTINCT v.id) as total_pedidos,
      COALESCE(SUM(v.total_venda), 0) as total_gasto
    FROM clientes c
    LEFT JOIN vendas v ON v.cliente_id = c.id
    GROUP BY c.id
    ORDER BY c.nome ASC
  `).all();

  res.json(clientes);
});

app.get('/api/clientes/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado.' });

  const vendas = db.prepare('SELECT * FROM vendas WHERE cliente_id = ? ORDER BY data_venda DESC').all(cliente.id);
  const orcamentos = db.prepare('SELECT * FROM orcamentos WHERE cliente_id = ? ORDER BY data_criacao DESC').all(cliente.id);

  res.json({ ...cliente, vendas, orcamentos });
});

// RF003: Cadastro Transparente / Direto
app.post('/api/clientes', (req, res) => {
  const { nome, whatsapp, endereco, instagram, documento } = req.body;
  if (!nome || !whatsapp) {
    return res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios.' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO clientes (nome, whatsapp, endereco, instagram, documento)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(nome, whatsapp, endereco || '', instagram || '', documento || '');
    const novo = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clientes/:id', (req, res) => {
  const { nome, whatsapp, endereco, instagram, documento } = req.body;
  db.prepare(`
    UPDATE clientes 
    SET nome = ?, whatsapp = ?, endereco = ?, instagram = ?, documento = ?
    WHERE id = ?
  `).run(nome, whatsapp, endereco, instagram, documento, req.params.id);

  const updated = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// -----------------------------------------------------------------------------
// 3. CATÁLOGO DE PRODUTOS & MATRIZ DE PEÇAS
// -----------------------------------------------------------------------------
app.get('/api/produtos', (req, res) => {
  try {
    const produtos = db.prepare(`
      SELECT 
        p.*,
        (
          SELECT COUNT(*) FROM itens_orcamento io WHERE LOWER(TRIM(io.produto_nome)) = LOWER(TRIM(p.nome))
        ) + (
          SELECT COUNT(*) FROM itens_venda iv WHERE LOWER(TRIM(iv.produto_nome)) = LOWER(TRIM(p.nome))
        ) as total_usos
      FROM produtos_base p
      ORDER BY total_usos DESC, p.nome ASC
    `).all();
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/produtos', (req, res) => {
  const { nome, categoria, preco_sugerido, preco_custo, descricao } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'O nome da peça é obrigatório.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM produtos_base WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))').get(nome.trim());
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma peça cadastrada com este nome no catálogo.' });
    }

    const result = db.prepare(`
      INSERT INTO produtos_base (nome, categoria, preco_sugerido, preco_custo, descricao)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      nome.trim(),
      categoria?.trim() || null,
      Number(preco_sugerido) || 0,
      Number(preco_custo) || 0,
      descricao?.trim() || ''
    );
    res.status(201).json(db.prepare('SELECT * FROM produtos_base WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/produtos/:id', (req, res) => {
  const { nome, categoria, preco_sugerido, preco_custo, descricao } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'O nome da peça é obrigatório.' });
  }

  try {
    db.prepare(`
      UPDATE produtos_base
      SET nome = ?, categoria = ?, preco_sugerido = ?, preco_custo = ?, descricao = ?
      WHERE id = ?
    `).run(
      nome.trim(),
      categoria?.trim() || null,
      Number(preco_sugerido) || 0,
      Number(preco_custo) || 0,
      descricao?.trim() || '',
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM produtos_base WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/produtos/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM produtos_base WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Peça removida do catálogo com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 4. FORNECEDORES / OFICINAS DE BORDADO (RF018, RF019)
// -----------------------------------------------------------------------------
app.get('/api/fornecedores', (req, res) => {
  // RF019: Contador de Peças Ativas no fornecedor (status_ordem = 'No Fornecedor')
  const fornecedores = db.prepare(`
    SELECT 
      f.*,
      COUNT(ob.id) as pecas_ativas_count,
      SUM(CASE WHEN ob.status_ordem = 'No Fornecedor' AND (ob.tem_prazo = 1 OR ob.tem_prazo IS NULL) AND ob.previsao_retorno IS NOT NULL AND ob.previsao_retorno != '' AND date('now', 'localtime') > date(ob.previsao_retorno) THEN 1 ELSE 0 END) as pecas_atrasadas_count
    FROM fornecedores f
    LEFT JOIN ordens_bordado ob ON ob.fornecedor_id = f.id AND ob.status_ordem = 'No Fornecedor'
    GROUP BY f.id
    ORDER BY f.nome_oficina ASC
  `).all();

  res.json(fornecedores);
});

app.post('/api/fornecedores', (req, res) => {
  const { nome_oficina, whatsapp, especialidade } = req.body;
  if (!nome_oficina || !whatsapp) {
    return res.status(400).json({ error: 'Nome da oficina e WhatsApp são obrigatórios.' });
  }

  const result = db.prepare(`
    INSERT INTO fornecedores (nome_oficina, whatsapp, prazo_medio_dias, especialidade)
    VALUES (?, ?, ?, ?)
  `).run(nome_oficina, whatsapp, null, especialidade || '');

  res.status(201).json(db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/fornecedores/:id', (req, res) => {
  const { nome_oficina, whatsapp, prazo_medio_dias, especialidade } = req.body;
  db.prepare(`
    UPDATE fornecedores
    SET nome_oficina = ?, whatsapp = ?, prazo_medio_dias = ?, especialidade = ?
    WHERE id = ?
  `).run(nome_oficina, whatsapp, prazo_medio_dias, especialidade, req.params.id);

  res.json(db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id));
});

// -----------------------------------------------------------------------------
// 5. ORÇAMENTOS COMERCIAIS (RF005 - RF010, RN001, RN002, RN003)
// -----------------------------------------------------------------------------
app.get('/api/orcamentos', (req, res) => {
  const orcamentos = db.prepare(`
    SELECT o.*, COUNT(io.id) as total_itens
    FROM orcamentos o
    LEFT JOIN itens_orcamento io ON io.orcamento_id = o.id
    GROUP BY o.id
    ORDER BY o.id DESC
  `).all();

  res.json(orcamentos);
});

app.get('/api/orcamentos/:id', (req, res) => {
  const orcamento = db.prepare('SELECT * FROM orcamentos WHERE id = ?').get(req.params.id);
  if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado.' });

  const itens = db.prepare(`
    SELECT io.*, f.nome_oficina as fornecedor_nome
    FROM itens_orcamento io
    LEFT JOIN fornecedores f ON f.id = io.fornecedor_id
    WHERE io.orcamento_id = ?
  `).all(orcamento.id);

  res.json({ ...orcamento, itens });
});

app.post('/api/orcamentos', (req, res) => {
  const {
    cliente_id,
    cliente_nome,
    cliente_whatsapp,
    cliente_endereco,
    cliente_instagram,
    cliente_doc,
    novo_cliente,
    validade_dias,
    forma_pagamento,
    condicoes_pagamento_json,
    previsao_entrega,
    observacoes,
    itens
  } = req.body;

  if (!itens || !itens.length) {
    return res.status(400).json({ error: 'O orçamento precisa ter pelo menos um item.' });
  }

  let finalClienteId = cliente_id;

  // RF003: Cadastro transparente de novo cliente sem sair da tela
  if ((!finalClienteId || novo_cliente) && cliente_nome && cliente_whatsapp) {
    const existing = db.prepare('SELECT id FROM clientes WHERE whatsapp = ? OR nome = ?').get(cliente_whatsapp, cliente_nome);
    if (existing) {
      finalClienteId = existing.id;
    } else {
      const newClient = db.prepare(`
        INSERT INTO clientes (nome, whatsapp, endereco, instagram, documento)
        VALUES (?, ?, ?, ?, ?)
      `).run(cliente_nome, cliente_whatsapp, cliente_endereco || '', cliente_instagram || '', cliente_doc || '');
      finalClienteId = newClient.lastInsertRowid;
    }
  }

  // RN002: Formação de preço = (preco_unitario + preco_bord_cliente) * quantidade
  // Custo = (preco_custo + custo_bordado) * quantidade
  let totalGeral = 0;
  let totalCusto = 0;
  itens.forEach(item => {
    const qty = Number(item.quantidade) || 1;
    const preco = Number(item.preco_unitario) || 0;
    const custo = Number(item.preco_custo) || Number(item.custo_produto_fornecedor) || 0;
    const bordadoAdic = item.tem_bordado ? (Number(item.preco_bord_cliente) || 0) : 0;
    const custoBordado = item.tem_bordado ? (Number(item.custo_bordado) || 0) : 0;

    const subtotal = (preco + bordadoAdic) * qty;
    const custoSubtotal = (custo + custoBordado) * qty;

    item.subtotal = subtotal;
    item.custo_subtotal = custoSubtotal;
    totalGeral += subtotal;
    totalCusto += custoSubtotal;
  });
  const totalLucro = totalGeral - totalCusto;

  const transaction = db.transaction(() => {
    // RN001: Snapshot do endereço e dados do cliente no momento da criação
    const orcStmt = db.prepare(`
      INSERT INTO orcamentos (
        cliente_id, cliente_nome_snap, cliente_whatsapp_snap, cliente_endereco_snap,
        cliente_doc_snap, cliente_instagram_snap, data_criacao, validade_dias,
        forma_pagamento, condicoes_pagamento_json, previsao_entrega, status, total_geral,
        custo_total, lucro_total, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = orcStmt.run(
      finalClienteId || null,
      cliente_nome,
      cliente_whatsapp,
      cliente_endereco || '',
      cliente_doc || '',
      cliente_instagram || '',
      getTodayIso(),
      Number(validade_dias) || 10,
      forma_pagamento || 'Pix à vista ou Cartão',
      condicoes_pagamento_json ? (typeof condicoes_pagamento_json === 'string' ? condicoes_pagamento_json : JSON.stringify(condicoes_pagamento_json)) : null,
      previsao_entrega || null,
      'Pendente',
      totalGeral,
      totalCusto,
      totalLucro,
      observacoes || ''
    );

    const orcamentoId = result.lastInsertRowid;

    const itemStmt = db.prepare(`
      INSERT INTO itens_orcamento (
        orcamento_id, produto_nome, quantidade, preco_unitario, tem_bordado,
        bordado_detalhe, fornecedor_id, custo_bordado, preco_bord_cliente, subtotal,
        previsao_retorno_bordado, oficina_produto_id, tem_prazo_produto,
        previsao_retorno_produto, custo_produto_fornecedor, tem_prazo_bordado,
        preco_custo, tipo_item
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of itens) {
      itemStmt.run(
        orcamentoId,
        item.produto_nome,
        Number(item.quantidade) || 1,
        Number(item.preco_unitario) || 0,
        item.tem_bordado ? 1 : 0,
        item.tem_bordado ? (item.bordado_detalhe || '') : null,
        item.tem_bordado ? (item.fornecedor_id || null) : null,
        item.tem_bordado ? (Number(item.custo_bordado) || 0) : 0,
        item.tem_bordado ? (Number(item.preco_bord_cliente) || 0) : 0,
        item.subtotal,
        item.tem_bordado ? (item.previsao_retorno_bordado || null) : null,
        item.oficina_produto_id ? Number(item.oficina_produto_id) : null,
        item.tem_prazo_produto ? 1 : 0,
        item.tem_prazo_produto ? (item.previsao_retorno_produto || null) : null,
        Number(item.custo_produto_fornecedor) || 0,
        item.tem_prazo_bordado !== false ? 1 : 0,
        Number(item.preco_custo) || Number(item.custo_produto_fornecedor) || 0,
        item.tipo_item || 'sob_encomenda'
      );

      // Auto-aprendizado do Catálogo: se a peça for nova, registra automaticamente em produtos_base
      if (item.produto_nome && item.produto_nome.trim()) {
        const cleanNome = item.produto_nome.trim();
        const existingProd = db.prepare('SELECT id FROM produtos_base WHERE LOWER(TRIM(nome)) = LOWER(?)').get(cleanNome);
        if (!existingProd) {
          db.prepare(`
            INSERT INTO produtos_base (nome, categoria, preco_sugerido, descricao)
            VALUES (?, ?, ?, ?)
          `).run(
            cleanNome,
            null,
            Number(item.preco_unitario) || 0,
            'Cadastrado automaticamente via Orçamento comercial'
          );
        }
      }
    }

    return orcamentoId;
  });

  try {
    const id = transaction();
    const orcamento = db.prepare('SELECT * FROM orcamentos WHERE id = ?').get(id);
    const itensSalvos = db.prepare('SELECT * FROM itens_orcamento WHERE orcamento_id = ?').all(id);
    res.status(201).json({ ...orcamento, itens: itensSalvos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RF010: Conversão em Venda (1 Clique)
// Altera status para 'Aprovado', cria Venda e despacha itens com personalização para Ordens de Serviço
app.post('/api/orcamentos/:id/converter', (req, res) => {
  const orcamento = db.prepare('SELECT * FROM orcamentos WHERE id = ?').get(req.params.id);
  if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado.' });

  if (orcamento.status === 'Aprovado') {
    return res.status(400).json({ error: 'Este orçamento já foi aprovado e convertido anteriormente.' });
  }

  const itens = db.prepare('SELECT * FROM itens_orcamento WHERE orcamento_id = ?').all(orcamento.id);

  const convertTx = db.transaction(() => {
    // 1. Atualizar status do orçamento
    db.prepare("UPDATE orcamentos SET status = 'Aprovado' WHERE id = ?").run(orcamento.id);

    // 2. Determinar status de produção inicial
    const hasTerceirizado = itens.some(i => i.tem_bordado === 1 || i.oficina_produto_id);
    const initialStatus = hasTerceirizado ? 'Em Produção' : 'Em Produção';

    // 3. Criar Venda
    const vendaStmt = db.prepare(`
      INSERT INTO vendas (
        orcamento_id, cliente_id, cliente_nome_snap, cliente_whatsapp_snap,
        cliente_endereco_snap, cliente_doc_snap, data_venda, previsao_entrega,
        status_producao, total_venda, custo_total, lucro_total, forma_pagamento, condicoes_pagamento_json, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const vResult = vendaStmt.run(
      orcamento.id,
      orcamento.cliente_id,
      orcamento.cliente_nome_snap,
      orcamento.cliente_whatsapp_snap,
      orcamento.cliente_endereco_snap,
      orcamento.cliente_doc_snap,
      getTodayIso(),
      orcamento.previsao_entrega,
      initialStatus,
      orcamento.total_geral,
      orcamento.custo_total || 0,
      orcamento.lucro_total || (orcamento.total_geral - (orcamento.custo_total || 0)),
      orcamento.forma_pagamento,
      orcamento.condicoes_pagamento_json || null,
      orcamento.observacoes ? `[Convertido de Orçamento #${orcamento.id}] ${orcamento.observacoes}` : `[Convertido de Orçamento #${orcamento.id}]`
    );

    const vendaId = vResult.lastInsertRowid;

    // 4. Copiar Itens e Gerar Ordens de Serviço (OS) na Esteira (RF014)
    const itemVendaStmt = db.prepare(`
      INSERT INTO itens_venda (
        venda_id, produto_nome, quantidade, preco_unitario, tem_bordado,
        bordado_detalhe, fornecedor_id, custo_bordado, preco_bord_cliente, subtotal,
        previsao_retorno_bordado, oficina_produto_id, tem_prazo_produto,
        previsao_retorno_produto, custo_produto_fornecedor, tem_prazo_bordado,
        preco_custo, tipo_item
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const osStmt = db.prepare(`
      INSERT INTO ordens_bordado (
        venda_id, item_venda_id, fornecedor_id, peca_descricao, detalhe_personalizacao,
        data_envio, previsao_retorno, data_retorno_real, custo_servico, status_ordem,
        tipo_servico, tem_prazo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const todayStr = getTodayIso();

    for (const item of itens) {
      const ivResult = itemVendaStmt.run(
        vendaId,
        item.produto_nome,
        item.quantidade,
        item.preco_unitario,
        item.tem_bordado,
        item.bordado_detalhe,
        item.fornecedor_id,
        item.custo_bordado,
        item.preco_bord_cliente,
        item.subtotal,
        item.previsao_retorno_bordado || null,
        item.oficina_produto_id || null,
        item.tem_prazo_produto ? 1 : 0,
        item.previsao_retorno_produto || null,
        item.custo_produto_fornecedor || 0,
        item.tem_prazo_bordado !== 0 ? 1 : 0,
        item.preco_custo || item.custo_produto_fornecedor || 0,
        item.tipo_item || 'sob_encomenda'
      );

      // A) Se o produto é confeccionado por oficina parceira -> Gera OS de Fabricação na Esteira
      if (item.oficina_produto_id) {
        const hasPrazoProd = item.tem_prazo_produto === 1;
        const prazoProdStr = hasPrazoProd ? (item.previsao_retorno_produto || orcamento.previsao_entrega || '') : '';

        osStmt.run(
          vendaId,
          ivResult.lastInsertRowid,
          item.oficina_produto_id,
          `${item.produto_nome} (${item.quantidade}x)`,
          'Fabricação / Confecção terceirizada da peça',
          todayStr,
          prazoProdStr,
          null,
          (Number(item.custo_produto_fornecedor) || 0) * item.quantidade,
          'No Fornecedor',
          'Fabricação / Peça',
          hasPrazoProd ? 1 : 0
        );
      }

      // B) Se a peça possui personalização / bordado terceirizado -> Gera OS de Bordado na Esteira
      if (item.tem_bordado === 1 && item.fornecedor_id) {
        const hasPrazoBord = item.tem_prazo_bordado !== 0;
        const prazoBordStr = hasPrazoBord ? (item.previsao_retorno_bordado || orcamento.previsao_entrega || todayStr) : '';

        osStmt.run(
          vendaId,
          ivResult.lastInsertRowid,
          item.fornecedor_id,
          `${item.produto_nome} (${item.quantidade}x)`,
          item.bordado_detalhe || 'Personalização conforme pedido',
          todayStr,
          prazoBordStr,
          null,
          (Number(item.custo_bordado) || 0) * item.quantidade,
          'No Fornecedor',
          'Personalização / Bordado',
          hasPrazoBord ? 1 : 0
        );
      }
    }

    return vendaId;
  });

  try {
    const vendaId = convertTx();
    res.json({
      success: true,
      message: `Orçamento #${orcamento.id} convertido com sucesso no Pedido de Venda #${vendaId}!`,
      venda_id: vendaId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 6. VENDAS DIRETAS E PEDIDOS (RF011 - RF013)
// -----------------------------------------------------------------------------
app.get('/api/vendas', (req, res) => {
  const vendas = db.prepare(`
    SELECT 
      v.*,
      COUNT(DISTINCT iv.id) as total_itens,
      COUNT(DISTINCT ob.id) as total_ordens_bordado,
      SUM(CASE WHEN ob.status_ordem = 'Pronto / Recebido' THEN 1 ELSE 0 END) as bordados_recebidos,
      SUM(CASE WHEN ob.status_ordem = 'No Fornecedor' AND date('now', 'localtime') > date(ob.previsao_retorno) THEN 1 ELSE 0 END) as bordados_atrasados
    FROM vendas v
    LEFT JOIN itens_venda iv ON iv.venda_id = v.id
    LEFT JOIN ordens_bordado ob ON ob.venda_id = v.id
    GROUP BY v.id
    ORDER BY v.id DESC
  `).all();

  res.json(vendas);
});

app.get('/api/vendas/:id', (req, res) => {
  const venda = db.prepare('SELECT * FROM vendas WHERE id = ?').get(req.params.id);
  if (!venda) return res.status(404).json({ error: 'Venda não encontrada.' });

  const itens = db.prepare(`
    SELECT iv.*, f.nome_oficina as fornecedor_nome
    FROM itens_venda iv
    LEFT JOIN fornecedores f ON f.id = iv.fornecedor_id
    WHERE iv.venda_id = ?
  `).all(venda.id);

  const ordens = db.prepare(`
    SELECT ob.*, f.nome_oficina, f.whatsapp as fornecedor_whatsapp
    FROM ordens_bordado ob
    LEFT JOIN fornecedores f ON f.id = ob.fornecedor_id
    WHERE ob.venda_id = ?
    ORDER BY ob.id ASC
  `).all(venda.id);

  res.json({ ...venda, itens, ordens_bordado: ordens });
});

// RF011: Lançamento de Venda Direta
app.post('/api/vendas', (req, res) => {
  const {
    cliente_id,
    cliente_nome,
    cliente_whatsapp,
    cliente_endereco,
    cliente_doc,
    novo_cliente,
    forma_pagamento,
    condicoes_pagamento_json,
    previsao_entrega,
    observacoes,
    itens
  } = req.body;

  if (!itens || !itens.length) {
    return res.status(400).json({ error: 'A venda precisa ter pelo menos um item.' });
  }

  let finalClienteId = cliente_id;
  if ((!finalClienteId || novo_cliente) && cliente_nome && cliente_whatsapp) {
    const existing = db.prepare('SELECT id FROM clientes WHERE whatsapp = ? OR nome = ?').get(cliente_whatsapp, cliente_nome);
    if (existing) {
      finalClienteId = existing.id;
    } else {
      const newClient = db.prepare(`
        INSERT INTO clientes (nome, whatsapp, endereco, documento)
        VALUES (?, ?, ?, ?)
      `).run(cliente_nome, cliente_whatsapp, cliente_endereco || '', cliente_doc || '');
      finalClienteId = newClient.lastInsertRowid;
    }
  }

  let totalVenda = 0;
  let totalCusto = 0;
  itens.forEach(item => {
    const qty = Number(item.quantidade) || 1;
    const preco = Number(item.preco_unitario) || 0;
    const custo = Number(item.preco_custo) || Number(item.custo_produto_fornecedor) || 0;
    const bordadoAdic = item.tem_bordado ? (Number(item.preco_bord_cliente) || 0) : 0;
    const custoBordado = item.tem_bordado ? (Number(item.custo_bordado) || 0) : 0;

    const subtotal = (preco + bordadoAdic) * qty;
    const custoSubtotal = (custo + custoBordado) * qty;

    item.subtotal = subtotal;
    item.custo_subtotal = custoSubtotal;
    totalVenda += subtotal;
    totalCusto += custoSubtotal;
  });
  const totalLucro = totalVenda - totalCusto;

  const hasTerceirizado = itens.some(i => i.tem_bordado || i.oficina_produto_id);
  const initialStatus = hasTerceirizado ? 'Em Produção' : 'Em Produção';

  const vendaTx = db.transaction(() => {
    const vStmt = db.prepare(`
      INSERT INTO vendas (
        orcamento_id, cliente_id, cliente_nome_snap, cliente_whatsapp_snap,
        cliente_endereco_snap, cliente_doc_snap, data_venda, previsao_entrega,
        status_producao, total_venda, custo_total, lucro_total, forma_pagamento, condicoes_pagamento_json, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = vStmt.run(
      null,
      finalClienteId || null,
      cliente_nome,
      cliente_whatsapp,
      cliente_endereco || '',
      cliente_doc || '',
      getTodayIso(),
      previsao_entrega || null,
      initialStatus,
      totalVenda,
      totalCusto,
      totalLucro,
      forma_pagamento || 'Pix à vista',
      condicoes_pagamento_json ? (typeof condicoes_pagamento_json === 'string' ? condicoes_pagamento_json : JSON.stringify(condicoes_pagamento_json)) : null,
      observacoes || ''
    );

    const vendaId = result.lastInsertRowid;

    const itemVendaStmt = db.prepare(`
      INSERT INTO itens_venda (
        venda_id, produto_nome, quantidade, preco_unitario, tem_bordado,
        bordado_detalhe, fornecedor_id, custo_bordado, preco_bord_cliente, subtotal,
        previsao_retorno_bordado, oficina_produto_id, tem_prazo_produto,
        previsao_retorno_produto, custo_produto_fornecedor, tem_prazo_bordado,
        preco_custo, tipo_item
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const osStmt = db.prepare(`
      INSERT INTO ordens_bordado (
        venda_id, item_venda_id, fornecedor_id, peca_descricao, detalhe_personalizacao,
        data_envio, previsao_retorno, data_retorno_real, custo_servico, status_ordem,
        tipo_servico, tem_prazo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const todayStr = getTodayIso();

    for (const item of itens) {
      const ivResult = itemVendaStmt.run(
        vendaId,
        item.produto_nome,
        item.quantidade,
        item.preco_unitario,
        item.tem_bordado ? 1 : 0,
        item.tem_bordado ? (item.bordado_detalhe || '') : null,
        item.tem_bordado ? (item.fornecedor_id || null) : null,
        item.tem_bordado ? (Number(item.custo_bordado) || 0) : 0,
        item.tem_bordado ? (Number(item.preco_bord_cliente) || 0) : 0,
        item.subtotal,
        item.tem_bordado ? (item.previsao_retorno_bordado || null) : null,
        item.oficina_produto_id ? Number(item.oficina_produto_id) : null,
        item.tem_prazo_produto ? 1 : 0,
        item.tem_prazo_produto ? (item.previsao_retorno_produto || null) : null,
        Number(item.custo_produto_fornecedor) || 0,
        item.tem_prazo_bordado !== false ? 1 : 0,
        Number(item.preco_custo) || Number(item.custo_produto_fornecedor) || 0,
        item.tipo_item || 'sob_encomenda'
      );

      // A) Se o produto é confeccionado por oficina parceira -> Gera OS de Fabricação na Esteira
      if (item.oficina_produto_id) {
        const hasPrazoProd = item.tem_prazo_produto === 1;
        const prazoProdStr = hasPrazoProd ? (item.previsao_retorno_produto || previsao_entrega || '') : '';

        osStmt.run(
          vendaId,
          ivResult.lastInsertRowid,
          Number(item.oficina_produto_id),
          `${item.produto_nome} (${item.quantidade}x)`,
          'Fabricação / Confecção terceirizada da peça',
          todayStr,
          prazoProdStr,
          null,
          (Number(item.custo_produto_fornecedor) || 0) * item.quantidade,
          'No Fornecedor',
          'Fabricação / Peça',
          hasPrazoProd ? 1 : 0
        );
      }

      // B) Se a peça possui personalização / bordado terceirizado -> Gera OS de Bordado na Esteira
      if (item.tem_bordado && item.fornecedor_id) {
        const hasPrazoBord = item.tem_prazo_bordado !== false;
        const prazoBordStr = hasPrazoBord ? (item.previsao_retorno_bordado || previsao_entrega || todayStr) : '';

        osStmt.run(
          vendaId,
          ivResult.lastInsertRowid,
          item.fornecedor_id,
          `${item.produto_nome} (${item.quantidade}x)`,
          item.bordado_detalhe || 'Personalização sob medida',
          todayStr,
          prazoBordStr,
          null,
          (Number(item.custo_bordado) || 0) * item.quantidade,
          'No Fornecedor',
          'Personalização / Bordado',
          hasPrazoBord ? 1 : 0
        );
      }

      // Auto-aprendizado do Catálogo: se a peça for nova, registra automaticamente em produtos_base
      if (item.produto_nome && item.produto_nome.trim()) {
        const cleanNome = item.produto_nome.trim();
        const existingProd = db.prepare('SELECT id FROM produtos_base WHERE LOWER(TRIM(nome)) = LOWER(?)').get(cleanNome);
        if (!existingProd) {
          db.prepare(`
            INSERT INTO produtos_base (nome, categoria, preco_sugerido, descricao)
            VALUES (?, ?, ?, ?)
          `).run(
            cleanNome,
            null,
            Number(item.preco_unitario) || 0,
            'Cadastrado automaticamente via Venda Direta'
          );
        }
      }
    }

    return vendaId;
  });

  try {
    const vendaId = vendaTx();
    res.status(201).json({ success: true, venda_id: vendaId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RF012: Atualização de Status da Venda
app.patch('/api/vendas/:id/status', (req, res) => {
  const { status_producao } = req.body;
  const validStatus = ['Em Produção', 'Aguardando Bordado', 'Pronto para Entrega', 'Entregue / Concluído'];
  if (!validStatus.includes(status_producao)) {
    return res.status(400).json({ error: 'Status de produção inválido.' });
  }

  db.prepare('UPDATE vendas SET status_producao = ? WHERE id = ?').run(status_producao, req.params.id);
  res.json({ success: true, status_producao });
});

// -----------------------------------------------------------------------------
// 7. TERCEIRIZAÇÃO DE BORDADOS (RF014 - RF017, RN004, RN005)
// -----------------------------------------------------------------------------
app.get('/api/ordens-bordado', (req, res) => {
  const ordens = db.prepare(`
    SELECT 
      ob.*,
      f.nome_oficina,
      f.whatsapp as fornecedor_whatsapp,
      v.cliente_nome_snap,
      v.cliente_whatsapp_snap,
      v.previsao_entrega as venda_previsao_entrega,
      v.status_producao as venda_status_producao,
      CASE 
        WHEN ob.status_ordem != 'Pronto / Recebido' 
          AND (ob.tem_prazo = 1 OR ob.tem_prazo IS NULL) 
          AND ob.previsao_retorno IS NOT NULL 
          AND ob.previsao_retorno != '' 
          AND date('now', 'localtime') > date(ob.previsao_retorno) 
        THEN 1 
        ELSE 0 
      END as is_atrasada,
      CASE 
        WHEN (ob.tem_prazo = 1 OR ob.tem_prazo IS NULL) AND ob.previsao_retorno IS NOT NULL AND ob.previsao_retorno != ''
        THEN CAST((julianday(ob.previsao_retorno) - julianday(date('now', 'localtime'))) AS INTEGER)
        ELSE NULL
      END as dias_restantes
    FROM ordens_bordado ob
    JOIN fornecedores f ON f.id = ob.fornecedor_id
    JOIN vendas v ON v.id = ob.venda_id
    ORDER BY 
      CASE WHEN ob.status_ordem = 'No Fornecedor' THEN 0 ELSE 1 END ASC,
      is_atrasada DESC,
      CASE WHEN (ob.previsao_retorno IS NULL OR ob.previsao_retorno = '' OR ob.tem_prazo = 0) THEN 1 ELSE 0 END ASC,
      ob.previsao_retorno ASC
  `).all();

  res.json(ordens);
});

// RF017 & RN005: Baixa de Retorno do Bordado com Conclusão Automática da Produção
app.patch('/api/ordens-bordado/:id/baixa', (req, res) => {
  const ordem = db.prepare('SELECT * FROM ordens_bordado WHERE id = ?').get(req.params.id);
  if (!ordem) return res.status(404).json({ error: 'Ordem de bordado não encontrada.' });

  const todayStr = getTodayIso();

  const baixaTx = db.transaction(() => {
    // 1. Dar baixa na ordem
    db.prepare(`
      UPDATE ordens_bordado
      SET status_ordem = 'Pronto / Recebido', data_retorno_real = ?
      WHERE id = ?
    `).run(todayStr, ordem.id);

    // 2. RN005: Verificar se todas as ordens desta venda foram concluídas
    const pendentes = db.prepare(`
      SELECT COUNT(*) as count 
      FROM ordens_bordado 
      WHERE venda_id = ? AND status_ordem != 'Pronto / Recebido'
    `).get(ordem.venda_id).count;

    let vendaAtualizada = false;
    if (pendentes === 0) {
      // Automaticamente migra para 'Pronto para Entrega'
      db.prepare(`
        UPDATE vendas 
        SET status_producao = 'Pronto para Entrega' 
        WHERE id = ? AND status_producao != 'Entregue / Concluído'
      `).run(ordem.venda_id);
      vendaAtualizada = true;
    }

    return { vendaAtualizada, venda_id: ordem.venda_id };
  });

  try {
    const result = baixaTx();
    res.json({
      success: true,
      message: 'Baixa de retorno registrada com sucesso!',
      venda_atualizada_pronto: result.vendaAtualizada,
      venda_id: result.venda_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reabrir ordem ou editar previsão de retorno
app.patch('/api/ordens-bordado/:id', (req, res) => {
  const { previsao_retorno, status_ordem, detalhe_personalizacao } = req.body;
  const updates = [];
  const params = [];

  if (previsao_retorno !== undefined) {
    updates.push('previsao_retorno = ?');
    params.push(previsao_retorno);
  }
  if (status_ordem !== undefined) {
    updates.push('status_ordem = ?');
    params.push(status_ordem);
    if (status_ordem === 'No Fornecedor') {
      updates.push('data_retorno_real = NULL');
    }
  }
  if (detalhe_personalizacao !== undefined) {
    updates.push('detalhe_personalizacao = ?');
    params.push(detalhe_personalizacao);
  }

  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE ordens_bordado SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 8. DASHBOARD & RELATÓRIOS (RF020, RF021, RF022)
// -----------------------------------------------------------------------------
app.get('/api/dashboard', (req, res) => {
  const { data_inicio, data_fim } = req.query;

  let whereVendas = '';
  const paramsVendas = [];

  if (data_inicio && data_fim) {
    whereVendas = 'WHERE date(data_venda) >= date(?) AND date(data_venda) <= date(?)';
    paramsVendas.push(data_inicio, data_fim);
  } else if (data_inicio) {
    whereVendas = 'WHERE date(data_venda) >= date(?)';
    paramsVendas.push(data_inicio);
  } else if (data_fim) {
    whereVendas = 'WHERE date(data_venda) <= date(?)';
    paramsVendas.push(data_fim);
  }

  // Faturamento, Custo e Lucro do período filtrado
  const faturamentoPeriodo = db.prepare(`
    SELECT 
      COALESCE(SUM(total_venda), 0) as total,
      COALESCE(SUM(custo_total), 0) as custo,
      COALESCE(SUM(lucro_total), 0) as lucro,
      COUNT(id) as total_pedidos
    FROM vendas
    ${whereVendas}
  `).get(...paramsVendas);

  // Faturamento, Custo e Lucro total geral acumulado
  const faturamentoTotal = db.prepare(`
    SELECT 
      COALESCE(SUM(total_venda), 0) as total,
      COALESCE(SUM(custo_total), 0) as custo,
      COALESCE(SUM(lucro_total), 0) as lucro,
      COUNT(id) as total_pedidos
    FROM vendas
  `).get();

  // Faturamento, Custo e Lucro do mês atual
  const faturamentoMes = db.prepare(`
    SELECT 
      COALESCE(SUM(total_venda), 0) as total,
      COALESCE(SUM(custo_total), 0) as custo,
      COALESCE(SUM(lucro_total), 0) as lucro,
      COUNT(id) as total_pedidos
    FROM vendas
    WHERE strftime('%Y-%m', data_venda) = strftime('%Y-%m', date('now', 'localtime'))
  `).get();

  const margemPeriodo = faturamentoPeriodo.total > 0
    ? ((faturamentoPeriodo.lucro / faturamentoPeriodo.total) * 100).toFixed(1)
    : 0;

  const margemMes = faturamentoMes.total > 0
    ? ((faturamentoMes.lucro / faturamentoMes.total) * 100).toFixed(1)
    : 0;

  const margemTotal = faturamentoTotal.total > 0
    ? ((faturamentoTotal.lucro / faturamentoTotal.total) * 100).toFixed(1)
    : 0;

  // Orçamentos e taxa de conversão
  let whereOrc = '';
  const paramsOrc = [];
  if (data_inicio && data_fim) {
    whereOrc = 'WHERE date(data_criacao) >= date(?) AND date(data_criacao) <= date(?)';
    paramsOrc.push(data_inicio, data_fim);
  }
  const totalOrcamentos = db.prepare(`SELECT COUNT(*) as count FROM orcamentos ${whereOrc}`).get(...paramsOrc).count;
  const orcamentosAprovados = db.prepare(`SELECT COUNT(*) as count FROM orcamentos ${whereOrc ? whereOrc + " AND status = 'Aprovado'" : "WHERE status = 'Aprovado'"}`).get(...paramsOrc).count;
  const taxaConversao = totalOrcamentos > 0 ? ((orcamentosAprovados / totalOrcamentos) * 100).toFixed(1) : 0;

  // Peças ativas em oficinas externas
  const pecasNoFornecedor = db.prepare(`
    SELECT COUNT(*) as count 
    FROM ordens_bordado 
    WHERE status_ordem = 'No Fornecedor'
  `).get().count;

  // Alertas de bordados/peças em atraso (RN004)
  const bordadosAtrasados = db.prepare(`
    SELECT COUNT(*) as count 
    FROM ordens_bordado 
    WHERE status_ordem = 'No Fornecedor' 
      AND (tem_prazo = 1 OR tem_prazo IS NULL) 
      AND previsao_retorno IS NOT NULL 
      AND previsao_retorno != '' 
      AND date('now', 'localtime') > date(previsao_retorno)
  `).get().count;

  // RF022: Tabela de Retornos Críticos (Hoje ou Atrasados)
  const retornosCriticos = db.prepare(`
    SELECT 
      ob.*,
      f.nome_oficina,
      f.whatsapp as fornecedor_whatsapp,
      v.cliente_nome_snap,
      CASE 
        WHEN date('now', 'localtime') > date(ob.previsao_retorno) THEN 'Em Atraso'
        WHEN date('now', 'localtime') = date(ob.previsao_retorno) THEN 'Retorno Hoje'
        ELSE 'Próximo'
      END as urgencia,
      CAST((julianday(ob.previsao_retorno) - julianday(date('now', 'localtime'))) AS INTEGER) as dias_restantes
    FROM ordens_bordado ob
    JOIN fornecedores f ON f.id = ob.fornecedor_id
    JOIN vendas v ON v.id = ob.venda_id
    WHERE ob.status_ordem = 'No Fornecedor'
      AND (ob.tem_prazo = 1 OR ob.tem_prazo IS NULL) 
      AND ob.previsao_retorno IS NOT NULL 
      AND ob.previsao_retorno != ''
    ORDER BY ob.previsao_retorno ASC
    LIMIT 10
  `).all();

  // Gráficos:
  // 1. Evolução diária de faturamento, custo e lucro no período
  const evolucaoFaturamento = db.prepare(`
    SELECT 
      date(data_venda) as data, 
      COALESCE(SUM(total_venda), 0) as total, 
      COALESCE(SUM(custo_total), 0) as custo,
      COALESCE(SUM(lucro_total), 0) as lucro,
      COUNT(id) as pedidos
    FROM vendas
    ${whereVendas}
    GROUP BY date(data_venda)
    ORDER BY data ASC
  `).all(...paramsVendas);

  // 2. Vendas por forma de pagamento no período
  const formasPagamento = db.prepare(`
    SELECT 
      CASE 
        WHEN forma_pagamento LIKE '%Pix%' THEN 'Pix'
        WHEN forma_pagamento LIKE '%Crédito%' THEN 'Cartão de Crédito'
        WHEN forma_pagamento LIKE '%Débito%' THEN 'Cartão de Débito'
        WHEN forma_pagamento LIKE '%Boleto%' THEN 'Boleto Bancário'
        WHEN forma_pagamento LIKE '%Dinheiro%' THEN 'Dinheiro'
        ELSE 'Outros'
      END as metodo,
      COUNT(id) as count,
      COALESCE(SUM(total_venda), 0) as total
    FROM vendas
    ${whereVendas}
    GROUP BY metodo
    ORDER BY total DESC
  `).all(...paramsVendas);

  // 3. Distribuição de status dos bordados
  const statusBordados = db.prepare(`
    SELECT 
      SUM(CASE WHEN status_ordem = 'No Fornecedor' AND date('now', 'localtime') <= date(previsao_retorno) THEN 1 ELSE 0 END) as no_prazo,
      SUM(CASE WHEN status_ordem = 'No Fornecedor' AND date('now', 'localtime') > date(previsao_retorno) THEN 1 ELSE 0 END) as em_atraso,
      SUM(CASE WHEN status_ordem = 'Pronto / Recebido' THEN 1 ELSE 0 END) as recebidos
    FROM ordens_bordado
  `).get();

  // 4. Vendas recentes por status de produção
  const vendasPorStatus = db.prepare(`
    SELECT status_producao, COUNT(*) as count
    FROM vendas
    ${whereVendas}
    GROUP BY status_producao
  `).all(...paramsVendas);

  // 5. Peças alocadas por oficina parceira
  const topOficinas = db.prepare(`
    SELECT 
      f.nome_oficina,
      COUNT(ob.id) as pecas_ativas,
      SUM(CASE WHEN date('now', 'localtime') > date(ob.previsao_retorno) THEN 1 ELSE 0 END) as pecas_atrasadas
    FROM fornecedores f
    LEFT JOIN ordens_bordado ob ON ob.fornecedor_id = f.id AND ob.status_ordem = 'No Fornecedor'
    GROUP BY f.id
    ORDER BY pecas_ativas DESC
  `).all();

  res.json({
    kpis: {
      faturamento_periodo: faturamentoPeriodo.total,
      custo_periodo: faturamentoPeriodo.custo,
      lucro_periodo: faturamentoPeriodo.lucro,
      margem_periodo: Number(margemPeriodo),
      pedidos_periodo: faturamentoPeriodo.total_pedidos,
      faturamento_mes: faturamentoMes.total,
      custo_mes: faturamentoMes.custo,
      lucro_mes: faturamentoMes.lucro,
      margem_mes: Number(margemMes),
      pedidos_mes: faturamentoMes.total_pedidos,
      faturamento_total: faturamentoTotal.total,
      custo_total: faturamentoTotal.custo,
      lucro_total: faturamentoTotal.lucro,
      margem_total: Number(margemTotal),
      pedidos_total: faturamentoTotal.total_pedidos,
      ticket_medio: faturamentoPeriodo.total_pedidos > 0 ? (faturamentoPeriodo.total / faturamentoPeriodo.total_pedidos).toFixed(2) : 0,
      orcamentos_ativos: totalOrcamentos - orcamentosAprovados,
      taxa_conversao: Number(taxaConversao),
      pecas_no_fornecedor: pecasNoFornecedor,
      bordados_atrasados: bordadosAtrasados
    },
    retornos_criticos: retornosCriticos,
    graficos: {
      status_bordados: statusBordados,
      vendas_status: vendasPorStatus,
      evolucao_faturamento: evolucaoFaturamento,
      formas_pagamento: formasPagamento,
      top_oficinas: topOficinas
    }
  });
});

// Fallback to React app for SPA routing
app.use((req, res) => {
  const indexHtml = path.join(distPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('ProHorse API Server is running. In production, run "npm run build" to serve the client.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🏇 Servidor ProHorse rodando com sucesso na porta ${PORT}`);
});
