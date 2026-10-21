import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Plus, Edit2, Trash2, DollarSign, 
  Layers, Sparkles, CheckCircle, AlertTriangle, X, TrendingUp
} from 'lucide-react';

export default function CatalogoView() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  // Modal de Cadastro / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formNome, setFormNome] = useState('');
  const [formPrecoCusto, setFormPrecoCusto] = useState('');
  const [formPreco, setFormPreco] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const carregarProdutos = () => {
    setLoading(true);
    fetch('/api/produtos')
      .then(res => res.json())
      .then(data => {
        setProdutos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const abrirNovo = () => {
    setEditandoId(null);
    setFormNome('');
    setFormPrecoCusto('');
    setFormPreco('');
    setFormDescricao('');
    setModalAberto(true);
  };

  const abrirEdicao = (prod) => {
    setEditandoId(prod.id);
    setFormNome(prod.nome);
    setFormPrecoCusto(prod.preco_custo !== undefined && prod.preco_custo !== null ? prod.preco_custo : '');
    setFormPreco(prod.preco_sugerido || '');
    setFormDescricao(prod.descricao || '');
    setModalAberto(true);
  };

  const salvarProduto = async (e) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setToastMsg({ type: 'error', text: 'O nome da peça é obrigatório.' });
      return;
    }

    setSalvando(true);
    try {
      const url = editandoId ? `/api/produtos/${editandoId}` : '/api/produtos';
      const method = editandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formNome.trim(),
          preco_custo: parseFloat(formPrecoCusto) || 0,
          preco_sugerido: parseFloat(formPreco) || 0,
          descricao: formDescricao.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setModalAberto(false);
        setToastMsg({
          type: 'success',
          text: editandoId 
            ? `✅ Peça "${formNome}" atualizada com sucesso!` 
            : `🎉 Peça "${formNome}" cadastrada no catálogo! Agora estará disponível no autocompletar de orçamentos.`
        });
        carregarProdutos();
      } else {
        setToastMsg({ type: 'error', text: data.error || 'Erro ao salvar peça.' });
      }
    } catch (err) {
      console.error(err);
      setToastMsg({ type: 'error', text: 'Falha de comunicação com o servidor.' });
    } finally {
      setSalvando(false);
    }
  };

  const excluirProduto = async (prod) => {
    if (!window.confirm(`Tem certeza que deseja remover "${prod.nome}" do catálogo?`)) return;

    try {
      const res = await fetch(`/api/produtos/${prod.id}`, { method: 'DELETE' });
      if (res.ok) {
        setToastMsg({
          type: 'info',
          text: `🗑️ Peça "${prod.nome}" removida do catálogo com sucesso.`
        });
        carregarProdutos();
      }
    } catch (err) {
      console.error(err);
      setToastMsg({ type: 'error', text: 'Erro ao remover peça do catálogo.' });
    }
  };

  // Filtragem exclusivamente por nome e detalhes da peça
  const produtosFiltrados = produtos.filter(p => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return p.nome.toLowerCase().includes(termo) ||
      (p.descricao && p.descricao.toLowerCase().includes(termo)) ||
      String(p.id).includes(termo);
  });

  // Métricas
  const totalPecas = produtos.length;
  const precoMedio = totalPecas > 0 
    ? produtos.reduce((acc, p) => acc + (Number(p.preco_sugerido) || 0), 0) / totalPecas 
    : 0;
  const pecaMaisUsada = [...produtos].sort((a, b) => (b.total_usos || 0) - (a.total_usos || 0))[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={22} color="var(--accent-gold)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
              Catálogo & Matriz de Peças
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Base de produtos inteligentes com auto-aprendizado automático nas vendas, preços sugeridos e autocompletar em menos de 250ms.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={abrirNovo}>
          <Plus size={16} /> Cadastrar Nova Peça
        </button>
      </div>

      {/* Banner de Feedback / Toast */}
      {toastMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: toastMsg.type === 'error'
            ? 'rgba(244, 63, 94, 0.2)'
            : 'rgba(16, 185, 129, 0.18)',
          border: `1px solid ${toastMsg.type === 'error' ? 'var(--danger-text)' : 'var(--success-text)'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {toastMsg.type === 'error' ? (
              <AlertTriangle size={18} color="var(--danger-text)" />
            ) : (
              <CheckCircle size={18} color="var(--success-text)" />
            )}
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
              {toastMsg.text}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Grid de KPIs Rápidos */}
      <div className="kpi-grid" style={{ marginBottom: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Total de Peças Cadastradas</div>
            <div className="kpi-value">{totalPecas}</div>
            <div className="kpi-subtext">Disponíveis no autocompletar</div>
          </div>
          <Layers size={28} color="var(--accent-gold)" style={{ opacity: 0.8 }} />
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Peça Mais Utilizada</div>
            <div className="kpi-value" style={{ fontSize: '1.1rem', wordBreak: 'break-word', lineHeight: 1.2 }}>
              {pecaMaisUsada ? pecaMaisUsada.nome.split(' ').slice(0, 4).join(' ') : 'Nenhuma'}
            </div>
            <div className="kpi-subtext">
              {pecaMaisUsada && pecaMaisUsada.total_usos > 0 ? `${pecaMaisUsada.total_usos} orçamentos/vendas` : 'Pronta para uso'}
            </div>
          </div>
          <TrendingUp size={28} color="#34d399" style={{ opacity: 0.8 }} />
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Preço Médio Sugerido</div>
            <div className="kpi-value" style={{ fontSize: '1.4rem' }}>
              {formatMoney(precoMedio)}
            </div>
            <div className="kpi-subtext">Valor base do portfólio</div>
          </div>
          <DollarSign size={28} color="var(--accent-gold)" style={{ opacity: 0.8 }} />
        </div>
      </div>

      {/* Barra de Busca Exclusiva por Nome */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar peça por nome (ex: Sela, Manta, Cabeçada, Calça...)"
            style={{ paddingLeft: '42px', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* Grid de Cards de Peças */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Carregando catálogo de peças...
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
          <Package size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>Nenhuma peça encontrada</div>
          <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            {busca
              ? 'Nenhuma peça corresponde ao termo digitado.' 
              : 'Clique em "Cadastrar Nova Peça" ou faça orçamentos/vendas para o sistema auto-cadastrar.'}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {produtosFiltrados.map((p) => (
            <div 
              key={p.id} 
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '18px 20px',
                gap: '14px',
                background: 'linear-gradient(145deg, rgba(23, 32, 51, 0.75) 0%, rgba(16, 22, 35, 0.85) 100%)',
                borderColor: p.total_usos > 0 ? 'rgba(245, 158, 11, 0.25)' : 'var(--bg-card-border)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1.3
                    }}>
                      {p.nome}
                    </h3>
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {p.total_usos > 0 ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                          🔥 {p.total_usos} {p.total_usos === 1 ? 'uso' : 'usos'}
                        </span>
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '0.72rem', padding: '2px 8px', color: 'var(--text-muted)' }}>
                          Recém-cadastrada
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Preço de Venda
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: 'var(--accent-gold)'
                    }}>
                      {formatMoney(p.preco_sugerido)}
                    </div>
                    {Number(p.preco_custo) > 0 && (
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                        Custo: <strong style={{ color: '#cbd5e1' }}>{formatMoney(p.preco_custo)}</strong>
                      </div>
                    )}
                    {Number(p.preco_sugerido) > Number(p.preco_custo || 0) && (
                      <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600, marginTop: '2px' }}>
                        + Lucro {formatMoney(Number(p.preco_sugerido) - Number(p.preco_custo || 0))}
                      </div>
                    )}
                  </div>
                </div>

                {p.descricao && (
                  <p style={{
                    fontSize: '0.825rem',
                    color: 'var(--text-muted)',
                    marginTop: '12px',
                    lineHeight: 1.45
                  }}>
                    {p.descricao}
                  </p>
                )}
              </div>

              {/* Ações do Card */}
              <div style={{
                borderTop: '1px solid var(--bg-card-border)',
                paddingTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  ID #{p.id}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => abrirEdicao(p)}
                    style={{ fontSize: '0.78rem', padding: '5px 10px', gap: '4px' }}
                    title="Editar informações da peça"
                  >
                    <Edit2 size={13} /> Editar
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => excluirProduto(p)}
                    style={{ fontSize: '0.78rem', padding: '5px 10px', color: 'var(--danger-text)' }}
                    title="Remover peça do catálogo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro / Edição de Peça (Direto: Nome + Preço + Descrição) */}
      {modalAberto && (
        <div className="modal-overlay" onClick={() => !salvando && setModalAberto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="var(--accent-gold)" />
                <h3 className="modal-title">
                  {editandoId ? 'Editar Peça do Catálogo' : 'Cadastrar Nova Peça'}
                </h3>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-icon btn-sm"
                onClick={() => setModalAberto(false)}
                disabled={salvando}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={salvarProduto}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Nome da Peça *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Sela Australiana Campeira em Couro Legítimo"
                    required
                    autoFocus
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    💡 Quando você digitar esse nome no orçamento ou venda, ele será autocompletado instantaneamente.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#cbd5e1' }}>Preço de Custo (R$)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={formPrecoCusto}
                      onChange={(e) => setFormPrecoCusto(e.target.value)}
                      placeholder="0,00"
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Custo de fabricação/peça
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--accent-gold)' }}>Preço da Venda (R$) *</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={formPreco}
                      onChange={(e) => setFormPreco(e.target.value)}
                      placeholder="0,00"
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Valor cobrado do cliente
                    </span>
                  </div>
                </div>

                {/* Previsão de Lucro na peça */}
                {(Number(formPreco) > 0 || Number(formPrecoCusto) > 0) && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>Margem estimada por unidade:</span>
                    <strong style={{ color: Number(formPreco) - Number(formPrecoCusto) >= 0 ? '#34d399' : '#f87171' }}>
                      {formatMoney(Number(formPreco || 0) - Number(formPrecoCusto || 0))}
                      {Number(formPreco) > 0 && (
                        <span style={{ fontSize: '0.75rem', opacity: 0.85, marginLeft: '6px' }}>
                          ({(((Number(formPreco) - Number(formPrecoCusto || 0)) / Number(formPreco)) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </strong>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Descrição / Especificação Técnica (Opcional)</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    placeholder="Detalhes de materiais, tipo de couro, armação, ferragens..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalAberto(false)}
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={salvando}
                >
                  {salvando ? 'Salvando...' : editandoId ? 'Salvar Alterações' : 'Cadastrar Peça'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
