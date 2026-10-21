import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, User, Phone, MapPin, Search, 
  Sparkles, ShieldCheck, CheckCircle, Calculator, PackagePlus, ArrowRight,
  Building2, Calendar, CreditCard, Clock, Layers, DollarSign, Split
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function NovoOrcamentoModal({ onClose, onCreated, isVendaDireta = false }) {
  // Dados do Cliente
  const [clienteId, setClienteId] = useState(null);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [documento, setDocumento] = useState('');
  const [instagram, setInstagram] = useState('');
  const [isNovoCliente, setIsNovoCliente] = useState(false);

  // Autocomplete state (RF001, RF002, RNF001)
  const [sugestoes, setSugestoes] = useState([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const debounceTimerRef = useRef(null);

  // Catálogo e Fornecedores
  const [produtosBase, setProdutosBase] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [dropdownItemIdx, setDropdownItemIdx] = useState(null);

  // Condições Gerais da Proposta
  const [validadeDias, setValidadeDias] = useState(10);
  const [previsaoEntrega, setPrevisaoEntrega] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 12);
    return d.toISOString().split('T')[0];
  });
  const [observacoes, setObservacoes] = useState('');

  // Multi-Formas e Datas de Pagamento
  const [condicoesPagamento, setCondicoesPagamento] = useState([
    {
      id: 1,
      forma: 'Pix',
      valor: '',
      data_vencimento: new Date().toISOString().split('T')[0],
      observacao: 'À vista / Entrada'
    }
  ]);

  // Itens Dinâmicos com Atribuição de Oficina do Produto + Bordado + Custo e Venda
  const [itens, setItens] = useState([
    {
      produto_nome: '',
      tipo_item: 'sob_encomenda', // 'sob_encomenda' | 'estoque'
      quantidade: 1,
      preco_custo: 0,
      preco_unitario: 0,
      oficina_produto_id: '', // '' = Produção Própria / Interno
      tem_prazo_produto: false,
      previsao_retorno_produto: '',
      custo_produto_fornecedor: 0,
      tem_bordado: false,
      bordado_detalhe: '',
      fornecedor_id: '',
      tem_prazo_bordado: true,
      previsao_retorno_bordado: '',
      custo_bordado: 0,
      preco_bord_cliente: 0,
      subtotal: 0,
      custo_subtotal: 0,
      lucro_item: 0,
      margem_item: 0
    }
  ]);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Carregar produtos base e oficinas parceiras
  useEffect(() => {
    fetch('/api/produtos')
      .then(res => res.json())
      .then(data => setProdutosBase(data))
      .catch(console.error);

    fetch('/api/fornecedores')
      .then(res => res.json())
      .then(data => {
        setFornecedores(data);
        if (data.length > 0) {
          setItens(prev => prev.map(item => ({
            ...item,
            fornecedor_id: item.fornecedor_id || data[0].id
          })));
        }
      })
      .catch(console.error);
  }, []);

  // RF001 & RNF001: Autocomplete com Debounce de 300ms
  const handleNomeChange = (val) => {
    setNome(val);
    setClienteId(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 2) {
      setSugestoes([]);
      setMostrarDropdown(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/clientes/busca?q=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        setSugestoes(data);
        setMostrarDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setBuscando(false);
      }
    }, 300);
  };

  // RF002: Preenchimento Automático dos dados
  const selecionarCliente = (c) => {
    setClienteId(c.id);
    setNome(c.nome);
    setWhatsapp(c.whatsapp || '');
    setEndereco(c.endereco || '');
    setDocumento(c.documento || '');
    setInstagram(c.instagram || '');
    setIsNovoCliente(false);
    setMostrarDropdown(false);
  };

  // Adicionar item
  const addItem = () => {
    setItens([
      ...itens,
      {
        produto_nome: '',
        tipo_item: 'sob_encomenda',
        quantidade: 1,
        preco_custo: 0,
        preco_unitario: 0,
        oficina_produto_id: '',
        tem_prazo_produto: false,
        previsao_retorno_produto: '',
        custo_produto_fornecedor: 0,
        tem_bordado: false,
        bordado_detalhe: '',
        fornecedor_id: fornecedores[0]?.id || '',
        tem_prazo_bordado: true,
        previsao_retorno_bordado: '',
        custo_bordado: 0,
        preco_bord_cliente: 0,
        subtotal: 0,
        custo_subtotal: 0,
        lucro_item: 0,
        margem_item: 0
      }
    ]);
  };

  // Remover item
  const removeItem = (idx) => {
    if (itens.length === 1) return;
    setItens(itens.filter((_, i) => i !== idx));
  };

  // Atualizar campo do item e recalcular subtotal, custo e lucro (RN002)
  const updateItem = (index, field, value) => {
    const novos = [...itens];
    novos[index][field] = value;

    // Sincroniza custo se alterar custo de oficina parceira
    if (field === 'custo_produto_fornecedor' && Number(value) > 0) {
      novos[index].preco_custo = value;
    } else if (field === 'preco_custo' && Number(value) > 0 && novos[index].oficina_produto_id) {
      novos[index].custo_produto_fornecedor = value;
    }

    const qty = Number(novos[index].quantidade) || 1;
    const precoVenda = Number(novos[index].preco_unitario) || 0;
    const precoCusto = Number(novos[index].preco_custo) || 0;
    const bordadoVenda = novos[index].tem_bordado ? (Number(novos[index].preco_bord_cliente) || 0) : 0;
    const bordadoCusto = novos[index].tem_bordado ? (Number(novos[index].custo_bordado) || 0) : 0;

    novos[index].subtotal = (precoVenda + bordadoVenda) * qty;
    novos[index].custo_subtotal = (precoCusto + bordadoCusto) * qty;
    novos[index].lucro_item = novos[index].subtotal - novos[index].custo_subtotal;
    novos[index].margem_item = novos[index].subtotal > 0 ? (novos[index].lucro_item / novos[index].subtotal) * 100 : 0;

    setItens(novos);
  };

  // Selecionar produto sugerido no autocompletar do catálogo
  const selecionarProdutoCatalogo = (index, produto) => {
    const novos = [...itens];
    novos[index].produto_nome = produto.nome;
    novos[index].preco_unitario = produto.preco_sugerido || 0;
    if (produto.preco_custo !== undefined && produto.preco_custo !== null) {
      novos[index].preco_custo = produto.preco_custo;
    }

    const qty = Number(novos[index].quantidade) || 1;
    const precoVenda = Number(novos[index].preco_unitario) || 0;
    const precoCusto = Number(novos[index].preco_custo) || 0;
    const bordadoVenda = novos[index].tem_bordado ? (Number(novos[index].preco_bord_cliente) || 0) : 0;
    const bordadoCusto = novos[index].tem_bordado ? (Number(novos[index].custo_bordado) || 0) : 0;

    novos[index].subtotal = (precoVenda + bordadoVenda) * qty;
    novos[index].custo_subtotal = (precoCusto + bordadoCusto) * qty;
    novos[index].lucro_item = novos[index].subtotal - novos[index].custo_subtotal;
    novos[index].margem_item = novos[index].subtotal > 0 ? (novos[index].lucro_item / novos[index].subtotal) * 100 : 0;

    setItens(novos);
    setDropdownItemIdx(null);
  };

  // Formatação Monetária
  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Total Geral, Custo Geral e Lucro Geral
  const totalGeral = itens.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  const totalCustoGeral = itens.reduce((acc, curr) => acc + (curr.custo_subtotal || 0), 0);
  const totalLucroGeral = totalGeral - totalCustoGeral;
  const margemLucroGeral = totalGeral > 0 ? (totalLucroGeral / totalGeral) * 100 : 0;

  // Gestão de Multi-Pagamentos
  const somaPagamentos = condicoesPagamento.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const diferencaPagamentos = Number((totalGeral - somaPagamentos).toFixed(2));

  // Inicializa valor do primeiro pagamento se ainda estiver vazio
  useEffect(() => {
    if (condicoesPagamento.length === 1 && (condicoesPagamento[0].valor === '' || Number(condicoesPagamento[0].valor) === 0) && totalGeral > 0) {
      setCondicoesPagamento([{ ...condicoesPagamento[0], valor: totalGeral }]);
    }
  }, [totalGeral]);

  const addPagamento = () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30 * condicoesPagamento.length);
    const dateStr = nextDate.toISOString().split('T')[0];
    const valorSugerido = diferencaPagamentos > 0 ? diferencaPagamentos : '';

    setCondicoesPagamento(prev => [
      ...prev,
      {
        id: Date.now(),
        forma: 'Boleto Bancário',
        valor: valorSugerido,
        data_vencimento: dateStr,
        observacao: `Parcela ${prev.length + 1}`
      }
    ]);
  };

  const removePagamento = (id) => {
    if (condicoesPagamento.length === 1) return;
    setCondicoesPagamento(prev => prev.filter(p => p.id !== id));
  };

  const updatePagamento = (id, field, val) => {
    setCondicoesPagamento(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const preencherRestante = (id) => {
    if (diferencaPagamentos <= 0) return;
    setCondicoesPagamento(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, valor: Number((Number(p.valor || 0) + diferencaPagamentos).toFixed(2)) };
      }
      return p;
    }));
  };

  const dividirIgualmente = (qtd) => {
    if (totalGeral <= 0) return;
    const valorBase = Number((totalGeral / qtd).toFixed(2));
    const novas = [];
    for (let i = 0; i < qtd; i++) {
      const d = new Date();
      d.setDate(d.getDate() + 30 * i);
      const v = i === qtd - 1 ? Number((totalGeral - valorBase * (qtd - 1)).toFixed(2)) : valorBase;
      novas.push({
        id: Date.now() + i,
        forma: i === 0 ? 'Pix' : (qtd <= 3 ? 'Pix' : 'Boleto Bancário'),
        valor: v,
        data_vencimento: d.toISOString().split('T')[0],
        observacao: `${i + 1}ª parcela`
      });
    }
    setCondicoesPagamento(novas);
  };

  const ajustarAoTotal = () => {
    if (condicoesPagamento.length === 1) {
      setCondicoesPagamento([{ ...condicoesPagamento[0], valor: totalGeral }]);
    } else {
      dividirIgualmente(condicoesPagamento.length);
    }
  };

  // Submissão do Orçamento / Venda Direta
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!nome.trim() || !whatsapp.trim()) {
      setErro('Nome do cliente e WhatsApp são obrigatórios.');
      return;
    }

    const itemInvalido = itens.some(i => !i.produto_nome.trim() || Number(i.quantidade) <= 0);
    if (itemInvalido) {
      setErro('Todos os itens precisam ter um nome e quantidade maior que zero.');
      return;
    }

    // Validação de prazos obrigatórios caso marcados
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      if (it.oficina_produto_id && it.tem_prazo_produto && !it.previsao_retorno_produto) {
        setErro(`Defina o prazo de entrega da oficina para a peça "${it.produto_nome}" ou desmarque a opção de prazo.`);
        return;
      }
      if (it.tem_bordado && it.tem_prazo_bordado && !it.previsao_retorno_bordado) {
        setErro(`Defina o prazo de retorno do bordado para a peça "${it.produto_nome}" ou desmarque a opção de prazo.`);
        return;
      }
    }

    setSalvando(true);

    // Formata sumário textual de pagamentos
    const pagamentosFormatados = condicoesPagamento.map(p => {
      const v = Number(p.valor) || 0;
      const dataFmt = p.data_vencimento ? p.data_vencimento.split('-').reverse().join('/') : 'A combinar';
      return `${p.forma}: ${v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${dataFmt}${p.observacao ? ` - ${p.observacao}` : ''})`;
    });

    const formaPagamentoDesc = pagamentosFormatados.length > 0 
      ? pagamentosFormatados.join(' + ') 
      : 'A combinar';

    const endpoint = isVendaDireta ? '/api/vendas' : '/api/orcamentos';
    const payload = {
      cliente_id: clienteId,
      cliente_nome: nome,
      cliente_whatsapp: whatsapp,
      cliente_endereco: endereco,
      cliente_doc: documento,
      cliente_instagram: instagram,
      novo_cliente: isNovoCliente || !clienteId,
      validade_dias: validadeDias,
      forma_pagamento: formaPagamentoDesc,
      condicoes_pagamento_json: condicoesPagamento,
      previsao_entrega: previsaoEntrega,
      observacoes,
      itens
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar proposta.');
      }

      // Efeito de confete para comemorar lançamento comercial!
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      onCreated(data);
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '980px', width: '100%' }}
      >
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              {isVendaDireta ? 'Novo Pedido de Venda Direta' : 'Criar Novo Orçamento Comercial'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isVendaDireta 
                ? 'Lançamento fechado com criação automática de ordens na Esteira de Oficinas' 
                : 'Preenchimento completo com múltiplos pagamentos, oficinas parceiras e esteira'}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {erro && (
              <div style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger-text)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem'
              }}>
                ⚠️ {erro}
              </div>
            )}

            {/* SEÇÃO 1: CLIENTE & CONTATO (RF001, RF002, RF003) */}
            <div className="modal-section-box">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <User size={15} /> 1. Identificação do Cliente
                </span>

                {clienteId && (
                  <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                    <ShieldCheck size={12} /> Cliente Recorrente Cadastrado (#{clienteId})
                  </span>
                )}
              </div>

              <div className="form-grid">
                {/* Nome com Autocomplete RF001 */}
                <div className="form-group col-half" style={{ position: 'relative' }}>
                  <label className="form-label">Nome Completo ou Razão Social *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={nome}
                      onChange={(e) => handleNomeChange(e.target.value)}
                      placeholder="Comece a digitar o nome do cliente..."
                      required
                      autoComplete="off"
                    />
                    {buscando && (
                      <span style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Buscando...
                      </span>
                    )}
                  </div>

                  {/* Dropdown de Autocomplete com Debounce */}
                  {mostrarDropdown && sugestoes.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#131b2c',
                      border: '1px solid var(--accent-gold)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
                      zIndex: 100,
                      maxHeight: '220px',
                      overflowY: 'auto'
                    }}>
                      <div style={{
                        padding: '6px 12px',
                        fontSize: '0.7rem',
                        color: 'var(--accent-gold)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        ⚡ Clientes Encontrados (Clique para preencher)
                      </div>
                      {sugestoes.map(c => (
                        <div
                          key={c.id}
                          onClick={() => selecionarCliente(c)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            transition: 'background 0.15s ease'
                          }}
                          className="autocomplete-item"
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>
                            {c.nome}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            📱 {c.whatsapp} {c.documento ? `• Doc: ${c.documento}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* WhatsApp */}
                <div className="form-group col-half">
                  <label className="form-label">WhatsApp com DDD (para envio com 1 clique) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                {/* Documento */}
                <div className="form-group col-half">
                  <label className="form-label">CPF / CNPJ</label>
                  <input
                    type="text"
                    className="form-input"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>

                {/* Instagram / Contato Adicional */}
                <div className="form-group col-half">
                  <label className="form-label">Instagram / Haras / Fazenda</label>
                  <input
                    type="text"
                    className="form-input"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@perfil ou Fazenda Rancho Alegre"
                  />
                </div>

                {/* Endereço de Entrega (Snapshot RN001) */}
                <div className="form-group col-full">
                  <label className="form-label">Endereço de Entrega (Salvo como Snapshot)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua / Fazenda, Cidade - UF, CEP"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: ITENS, OFICINAS PARCEIRAS & BORDADOS */}
            <div className="modal-section-box">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <span style={{
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <PackagePlus size={15} /> 2. Peças, Oficinas Parceiras & Personalização
                </span>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addItem}
                >
                  <Plus size={14} /> Adicionar Outro Item
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {itens.map((item, idx) => (
                  <div key={idx} className="item-composer-card">
                    {/* Header do Card com Número e Seletor Sob Encomenda / Estoque */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff', letterSpacing: '0.04em' }}>
                          ITEM #{idx + 1}
                        </span>
                        {item.tipo_item === 'estoque' ? (
                          <span className="badge badge-info" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📦 Produto do Estoque
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🪡 Sob Encomenda (Produção)
                          </span>
                        )}
                      </div>

                      {/* Toggle Pills: Sob Encomenda vs Produto do Estoque */}
                      <div style={{
                        display: 'inline-flex',
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '3px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <button
                          type="button"
                          onClick={() => updateItem(idx, 'tipo_item', 'sob_encomenda')}
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: item.tipo_item !== 'estoque' ? '#2563eb' : 'transparent',
                            color: item.tipo_item !== 'estoque' ? '#ffffff' : 'var(--text-muted)'
                          }}
                        >
                          🪡 Sob Encomenda
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItem(idx, 'tipo_item', 'estoque')}
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: item.tipo_item === 'estoque' ? '#2563eb' : 'transparent',
                            color: item.tipo_item === 'estoque' ? '#ffffff' : 'var(--text-muted)'
                          }}
                        >
                          📦 Produto do Estoque
                        </button>
                      </div>
                    </div>

                    {/* Linha de Composição: Nome, Qtd, Preço de Custo, Preço de Venda */}
                    <div className="item-composer-grid">
                      {/* Nome / Peça */}
                      <div className="grid-desc" style={{ position: 'relative' }}>
                        <label className="item-micro-label">
                          Peça / Produto (com Autocomplete do Catálogo) *
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={item.produto_nome}
                          onChange={(e) => {
                            updateItem(idx, 'produto_nome', e.target.value);
                            setDropdownItemIdx(idx);
                          }}
                          onFocus={() => {
                            if (item.produto_nome && item.produto_nome.trim().length > 0) {
                              setDropdownItemIdx(idx);
                            }
                          }}
                          onBlur={() => setTimeout(() => setDropdownItemIdx(null), 250)}
                          placeholder="Digite a peça sob encomenda (ex: Sela Australiana, Manta, Cabeçada...)"
                          required
                          autoComplete="off"
                          style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                        />

                        {/* Dropdown Flutuante de Sugestões do Catálogo */}
                        {dropdownItemIdx === idx && item.produto_nome && item.produto_nome.trim().length > 0 && (
                          (() => {
                            const matches = produtosBase.filter(p =>
                              p.nome.toLowerCase().includes(item.produto_nome.toLowerCase())
                            ).slice(0, 5);

                            if (matches.length === 0) return null;

                            return (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 'calc(100% + 4px)',
                                  left: 0,
                                  right: 0,
                                  background: '#131b2c',
                                  border: '1px solid var(--accent-gold)',
                                  borderRadius: 'var(--radius-md)',
                                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
                                  zIndex: 100,
                                  maxHeight: '230px',
                                  overflowY: 'auto'
                                }}
                              >
                                <div style={{
                                  padding: '6px 12px',
                                  fontSize: '0.7rem',
                                  color: 'var(--accent-gold)',
                                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <Sparkles size={12} /> Catálogo ProHorse (Clique para selecionar)
                                </div>
                                {matches.map(p => (
                                  <div
                                    key={p.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selecionarProdutoCatalogo(idx, p);
                                    }}
                                    style={{
                                      padding: '9px 12px',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '8px',
                                      transition: 'background 0.15s ease'
                                    }}
                                    className="catalog-autocomplete-item"
                                  >
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#fff' }}>
                                        {p.nome}
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{
                                        fontWeight: 700,
                                        fontSize: '0.82rem',
                                        color: 'var(--accent-gold)',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        Venda: {formatMoney(p.preco_sugerido)}
                                      </div>
                                      {Number(p.preco_custo) > 0 && (
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                          Custo: {formatMoney(p.preco_custo)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()
                        )}
                      </div>

                      {/* Quantidade */}
                      <div className="grid-qtd">
                        <label className="item-micro-label">Qtd *</label>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={item.quantidade}
                          onChange={(e) => updateItem(idx, 'quantidade', e.target.value)}
                          style={{ padding: '8px 8px', fontSize: '0.85rem', textAlign: 'center' }}
                          required
                        />
                      </div>

                      {/* Preço de Custo */}
                      <div className="grid-custo">
                        <label className="item-micro-label" style={{ color: '#94a3b8' }}>
                          Preço de Custo (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input"
                          value={item.preco_custo}
                          onChange={(e) => updateItem(idx, 'preco_custo', e.target.value)}
                          placeholder="0,00"
                          style={{ padding: '8px 10px', fontSize: '0.85rem', textAlign: 'right', borderColor: 'rgba(148, 163, 184, 0.3)' }}
                        />
                      </div>

                      {/* Preço da Venda */}
                      <div className="grid-preco">
                        <label className="item-micro-label" style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                          Preço da Venda (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input"
                          value={item.preco_unitario}
                          onChange={(e) => updateItem(idx, 'preco_unitario', e.target.value)}
                          placeholder="0,00"
                          style={{ padding: '8px 10px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 700, borderColor: 'rgba(245, 158, 11, 0.4)' }}
                          required
                        />
                      </div>

                      {/* Botão Remover */}
                      <div className="grid-trash">
                        <label className="item-micro-label desktop-only">&nbsp;</label>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon btn-sm item-trash-btn"
                          onClick={() => removeItem(idx)}
                          disabled={itens.length === 1}
                          title="Remover peça"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* BLOCO NOVO: FABRICAÇÃO / OFICINA PARCEIRA DO PRODUTO */}
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div>
                        <label className="item-micro-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93c5fd' }}>
                          <Building2 size={13} /> Origem / Oficina Parceira que produz a peça:
                        </label>
                        <select
                          className="form-select"
                          value={item.oficina_produto_id || ''}
                          onChange={(e) => updateItem(idx, 'oficina_produto_id', e.target.value)}
                          style={{ padding: '7px 10px', fontSize: '0.84rem' }}
                        >
                          <option value="">🏭 Fabricação Própria / Interno (Selaria ProHorse)</option>
                          {fornecedores.map(f => (
                            <option key={f.id} value={f.id}>
                              🤝 {f.nome_oficina} — {f.especialidade || 'Oficina Terceirizada'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Se for oficina parceira externa -> Abre opções de prazo e custo da peça */}
                      {Boolean(item.oficina_produto_id) && (
                        <div className="product-workshop-subgrid">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <input
                                type="checkbox"
                                id={`prazo-prod-${idx}`}
                                checked={Boolean(item.tem_prazo_produto)}
                                onChange={(e) => updateItem(idx, 'tem_prazo_produto', e.target.checked)}
                                style={{ width: '15px', height: '15px', accentColor: 'var(--accent-gold)' }}
                              />
                              <label 
                                htmlFor={`prazo-prod-${idx}`}
                                style={{ fontSize: '0.8rem', fontWeight: 600, color: item.tem_prazo_produto ? 'var(--accent-gold)' : 'var(--text-muted)', cursor: 'pointer' }}
                              >
                                ⏱️ Definir prazo de entrega da oficina parceira
                              </label>
                            </div>

                            {item.tem_prazo_produto ? (
                              <div>
                                <label className="item-micro-label" style={{ color: 'var(--accent-gold)' }}>
                                  Previsão de Retorno da Peça *
                                </label>
                                <input
                                  type="date"
                                  className="form-input"
                                  value={item.previsao_retorno_produto || ''}
                                  onChange={(e) => updateItem(idx, 'previsao_retorno_produto', e.target.value)}
                                  style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                                  required={item.tem_prazo_produto}
                                />
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                                ℹ️ Sem prazo estipulado (a combinar com a oficina parceira)
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="item-micro-label">Custo da Oficina pela Peça (R$ - opcional)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="form-input"
                              value={item.custo_produto_fornecedor || ''}
                              onChange={(e) => updateItem(idx, 'custo_produto_fornecedor', e.target.value)}
                              placeholder="Quanto a oficina cobra para fabricar (ex: 800)"
                              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                              Custo de confecção terceirizada
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* BLOCO DE PERSONALIZAÇÃO / BORDADO */}
                    <div style={{
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          id={`bordado-${idx}`}
                          checked={item.tem_bordado}
                          onChange={(e) => updateItem(idx, 'tem_bordado', e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }}
                        />
                        <label 
                          htmlFor={`bordado-${idx}`}
                          style={{ 
                            fontSize: '0.825rem', 
                            fontWeight: 600, 
                            color: item.tem_bordado ? 'var(--accent-gold)' : 'var(--text-muted)',
                            cursor: 'pointer' 
                          }}
                        >
                          🧵 Adicionar Personalização / Bordado Terceirizado
                        </label>
                      </div>

                      {item.tem_bordado && (
                        <div className="embroidery-composer-subgrid">
                          <div className="subgrid-full">
                            <label className="item-micro-label">
                              Detalhe Técnico da Arte (Posição, Cores de Fio, Matriz)
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              value={item.bordado_detalhe}
                              onChange={(e) => updateItem(idx, 'bordado_detalhe', e.target.value)}
                              placeholder="Ex: Brasão Sol nas duas abas, fio dourado em relevo 3D"
                              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            />
                          </div>

                          <div className="subgrid-half">
                            <label className="item-micro-label">Oficina Parceira de Bordado</label>
                            <select
                              className="form-select"
                              value={item.fornecedor_id}
                              onChange={(e) => updateItem(idx, 'fornecedor_id', Number(e.target.value))}
                              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            >
                              {fornecedores.map(f => (
                                <option key={f.id} value={f.id}>{f.nome_oficina}</option>
                              ))}
                            </select>
                          </div>

                          <div className="subgrid-half">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <input
                                type="checkbox"
                                id={`prazo-bord-${idx}`}
                                checked={item.tem_prazo_bordado !== false}
                                onChange={(e) => updateItem(idx, 'tem_prazo_bordado', e.target.checked)}
                                style={{ width: '14px', height: '14px', accentColor: 'var(--accent-gold)' }}
                              />
                              <label htmlFor={`prazo-bord-${idx}`} style={{ fontSize: '0.75rem', color: 'var(--text-gold)', cursor: 'pointer', fontWeight: 600 }}>
                                ⏱️ Definir prazo retorno bordado?
                              </label>
                            </div>

                            {item.tem_prazo_bordado !== false ? (
                              <input
                                type="date"
                                className="form-input"
                                value={item.previsao_retorno_bordado || ''}
                                onChange={(e) => updateItem(idx, 'previsao_retorno_bordado', e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                                required={item.tem_bordado && item.tem_prazo_bordado !== false}
                              />
                            ) : (
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                                Sem prazo estipulado para o bordado
                              </div>
                            )}
                          </div>

                          <div className="subgrid-half">
                            <label className="item-micro-label">Custo da Oficina de Bordado (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="form-input"
                              value={item.custo_bordado}
                              onChange={(e) => updateItem(idx, 'custo_bordado', e.target.value)}
                              placeholder="Quanto a oficina cobra (ex: 50)"
                              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                              Custo a pagar para a oficina
                            </span>
                          </div>

                          <div className="subgrid-half">
                            <label className="item-micro-label" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                              + Cobrado do Cliente (R$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="form-input"
                              value={item.preco_bord_cliente}
                              onChange={(e) => updateItem(idx, 'preco_bord_cliente', e.target.value)}
                              placeholder="Valor final cobrado (ex: 60)"
                              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            />
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', marginTop: '2px', display: 'block' }}>
                              Valor cheio cobrado na peça
                            </span>
                          </div>

                          {/* Indicador de Margem e Lucro do Bordado em Tempo Real */}
                          {(Number(item.preco_bord_cliente) > 0 || Number(item.custo_bordado) > 0) && (
                            <div className="subgrid-full" style={{
                              fontSize: '0.76rem',
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: (Number(item.preco_bord_cliente) - Number(item.custo_bordado) >= 0) ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.15)',
                              border: `1px solid ${(Number(item.preco_bord_cliente) - Number(item.custo_bordado) >= 0) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.4)'}`,
                              color: (Number(item.preco_bord_cliente) - Number(item.custo_bordado) >= 0) ? 'var(--success-text)' : 'var(--danger-text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <span>
                                {Number(item.preco_bord_cliente) >= Number(item.custo_bordado) ? (
                                  <>💰 <strong>Lucro no Bordado:</strong> {formatMoney(Number(item.preco_bord_cliente) - Number(item.custo_bordado))} por peça</>
                                ) : (
                                  <>⚠️ <strong>Atenção:</strong> Cobrando {formatMoney(item.preco_bord_cliente)} para custo de {formatMoney(item.custo_bordado)}. Insira o valor cheio (ex: 60)!</>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Subtotal da linha e indicador de Lucratividade do Item */}
                      <div style={{
                        marginTop: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        padding: '9px 14px',
                        background: 'rgba(15, 23, 42, 0.65)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '0.825rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#94a3b8' }}>
                            Custo Total: <strong style={{ color: '#cbd5e1' }}>{formatMoney(item.custo_subtotal || 0)}</strong>
                          </span>
                          <span style={{ color: (item.lucro_item >= 0 ? '#34d399' : '#f87171'), fontWeight: 600 }}>
                            {item.lucro_item >= 0 ? '📈 Lucro Previsto: ' : '📉 Prejuízo: '}
                            <strong>{formatMoney(item.lucro_item || 0)}</strong>
                            {item.subtotal > 0 && (
                              <span style={{ fontSize: '0.74rem', marginLeft: '5px', opacity: 0.9 }}>
                                ({(item.margem_item || 0).toFixed(1)}% margem)
                              </span>
                            )}
                          </span>
                        </div>

                        <div>
                          Subtotal Venda: <strong style={{ color: 'var(--accent-gold)', fontSize: '0.98rem' }}>
                            {formatMoney(item.subtotal)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 3: MÚLTIPLAS FORMAS & DATAS DE PAGAMENTO */}
            <div className="multi-payments-box">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <span style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--accent-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <CreditCard size={15} /> 3. Condições, Formas & Datas de Pagamento
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Configure pagamentos combinados (ex: R$ 1.000 em Pix hoje + R$ 1.000 em Boleto agendado)
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => dividirIgualmente(2)}
                    title="Dividir total em 2 parcelas iguais com intervalo de 30 dias"
                  >
                    <Split size={13} /> 2x Iguais
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => dividirIgualmente(3)}
                    title="Dividir total em 3 parcelas iguais com intervalo de 30 dias"
                  >
                    <Split size={13} /> 3x Iguais
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={addPagamento}
                    style={{ background: 'var(--accent-gradient)' }}
                  >
                    <Plus size={14} /> Adicionar Pagamento
                  </button>
                </div>
              </div>

              {/* Lista dinâmica de formas de pagamento */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {condicoesPagamento.map((p, pIdx) => (
                  <div key={p.id} className="payment-row-card">
                    {/* Forma de Pagamento */}
                    <div>
                      <label className="item-micro-label">Forma de Pagamento</label>
                      <select
                        className="form-select"
                        value={p.forma}
                        onChange={(e) => updatePagamento(p.id, 'forma', e.target.value)}
                        style={{ padding: '7px 10px', fontSize: '0.84rem' }}
                      >
                        <option value="Pix">Pix</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Boleto Bancário">Boleto Bancário</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Transferência Bancária (TED/DOC)">Transferência Bancária (TED/DOC)</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Promissória">Promissória</option>
                      </select>
                    </div>

                    {/* Valor (R$) */}
                    <div>
                      <label className="item-micro-label" style={{ color: 'var(--accent-gold)' }}>Valor (R$) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={p.valor}
                        onChange={(e) => updatePagamento(p.id, 'valor', e.target.value)}
                        placeholder="0,00"
                        style={{ padding: '7px 10px', fontSize: '0.84rem', fontWeight: 700 }}
                        required
                      />
                    </div>

                    {/* Data de Vencimento / Pagamento */}
                    <div>
                      <label className="item-micro-label">Data de Vencimento *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={p.data_vencimento || ''}
                        onChange={(e) => updatePagamento(p.id, 'data_vencimento', e.target.value)}
                        style={{ padding: '7px 10px', fontSize: '0.84rem' }}
                        required
                      />
                    </div>

                    {/* Detalhes / Observação */}
                    <div className="payment-col-obs">
                      <label className="item-micro-label">Identificação / Parcela (opcional)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={p.observacao || ''}
                        onChange={(e) => updatePagamento(p.id, 'observacao', e.target.value)}
                        placeholder="Ex: Entrada no ato, Parcela 2, Saldo na entrega..."
                        style={{ padding: '7px 10px', fontSize: '0.84rem' }}
                      />
                    </div>

                    {/* Remover Parcela */}
                    <div className="payment-col-trash">
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon btn-sm item-trash-btn"
                        onClick={() => removePagamento(p.id)}
                        disabled={condicoesPagamento.length === 1}
                        title="Remover este pagamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Barra de Conferência de Saldo do Pagamento */}
              <div 
                className="payment-balance-pill"
                style={{
                  background: Math.abs(diferencaPagamentos) < 0.05 
                    ? 'rgba(16, 185, 129, 0.12)' 
                    : diferencaPagamentos > 0 
                      ? 'rgba(245, 158, 11, 0.12)' 
                      : 'rgba(244, 63, 94, 0.12)',
                  border: `1px solid ${Math.abs(diferencaPagamentos) < 0.05 
                    ? 'rgba(16, 185, 129, 0.3)' 
                    : diferencaPagamentos > 0 
                      ? 'rgba(245, 158, 11, 0.3)' 
                      : 'rgba(244, 63, 94, 0.3)'}`,
                  color: Math.abs(diferencaPagamentos) < 0.05 
                    ? 'var(--success-text)' 
                    : diferencaPagamentos > 0 
                      ? '#f59e0b' 
                      : 'var(--danger-text)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {Math.abs(diferencaPagamentos) < 0.05 ? (
                    <>
                      <CheckCircle size={16} />
                      <span>Total programado bate 100% com o valor do pedido ({formatMoney(somaPagamentos)})</span>
                    </>
                  ) : diferencaPagamentos > 0 ? (
                    <>
                      <span>⚠️ Total programado: {formatMoney(somaPagamentos)}. <strong>Falta programar {formatMoney(diferencaPagamentos)}</strong></span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={ajustarAoTotal}
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      >
                        Completar Total
                      </button>
                    </>
                  ) : (
                    <>
                      <span>⚠️ Total programado ({formatMoney(somaPagamentos)}) excede o pedido em <strong>{formatMoney(Math.abs(diferencaPagamentos))}</strong></span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={ajustarAoTotal}
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      >
                        Ajustar ao Total
                      </button>
                    </>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  {condicoesPagamento.length} {condicoesPagamento.length === 1 ? 'pagamento' : 'pagamentos'}
                </div>
              </div>

              {/* Informações Complementares da Proposta */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '6px' }}>
                <div className="form-group">
                  <label className="form-label">Previsão de Entrega Final</label>
                  <input
                    type="date"
                    className="form-input"
                    value={previsaoEntrega}
                    onChange={(e) => setPrevisaoEntrega(e.target.value)}
                  />
                </div>

                {!isVendaDireta && (
                  <div className="form-group">
                    <label className="form-label">Validade da Proposta (dias)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={validadeDias}
                      onChange={(e) => setValidadeDias(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Observações Comerciais ou Instruções de Chão de Fábrica</label>
                  <input
                    type="text"
                    className="form-input"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Embalagem para presente, cliente vai retirar na loja física..."
                  />
                </div>
              </div>
            </div>

            {/* Totalizador Geral com Margem e Lucro */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(217, 119, 6, 0.15) 0%, rgba(23, 32, 51, 0.85) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 22px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Consolidação Financeira & Lucratividade
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    Custo Total: <strong style={{ color: '#cbd5e1' }}>{formatMoney(totalCustoGeral)}</strong>
                  </span>
                  <span style={{ fontSize: '0.82rem', color: totalLucroGeral >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                    {totalLucroGeral >= 0 ? '💰 Lucro Previsto: ' : '⚠️ Prejuízo: '}
                    <strong>{formatMoney(totalLucroGeral)}</strong>
                    {totalGeral > 0 && (
                      <span style={{
                        fontSize: '0.72rem',
                        marginLeft: '6px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: totalLucroGeral >= 0 ? 'rgba(52, 211, 153, 0.18)' : 'rgba(244, 63, 94, 0.18)',
                        border: `1px solid ${totalLucroGeral >= 0 ? 'rgba(52, 211, 153, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`
                      }}>
                        {margemLucroGeral.toFixed(1)}% margem
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total do Pedido (Venda)
                </span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'var(--accent-gold)'
                }}>
                  {formatMoney(totalGeral)}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? (
                <span>Salvando...</span>
              ) : isVendaDireta ? (
                <>
                  <CheckCircle size={18} /> Lançar Venda Direta & Gerar OS na Esteira
                </>
              ) : (
                <>
                  <CheckCircle size={18} /> Salvar & Emitir Orçamento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
