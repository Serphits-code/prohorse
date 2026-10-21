import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Plus, Search, Scissors, Printer, CheckCircle, 
  Clock, Truck, PackageCheck, AlertTriangle, Eye, ChevronDown
} from 'lucide-react';
import FichaProducaoModal from './FichaProducaoModal';

export default function VendasView({ onOpenNovaVenda }) {
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [vendaSelecionada, setVendaSelecionada] = useState(null);

  const carregarVendas = () => {
    setLoading(true);
    fetch('/api/vendas')
      .then(res => res.json())
      .then(data => {
        setVendas(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    carregarVendas();
  }, []);

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // RF012: Atualizar Status do Pedido
  const atualizarStatusVenda = async (vendaId, novoStatus) => {
    try {
      const res = await fetch(`/api/vendas/${vendaId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_producao: novoStatus })
      });
      if (res.ok) {
        carregarVendas();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Abrir Ficha de Produção (RF013)
  const abrirFichaProducao = async (vendaId) => {
    try {
      const res = await fetch(`/api/vendas/${vendaId}`);
      const data = await res.json();
      setVendaSelecionada(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtragem
  const vendasFiltradas = vendas.filter(v => {
    const matchStatus = filtroStatus === 'Todos' || v.status_producao === filtroStatus;
    const matchBusca = busca === '' ||
      v.cliente_nome_snap.toLowerCase().includes(busca.toLowerCase()) ||
      String(v.id).includes(busca) ||
      (v.cliente_whatsapp_snap && v.cliente_whatsapp_snap.includes(busca));
    return matchStatus && matchBusca;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pronto para Entrega':
        return 'badge-success';
      case 'Aguardando Bordado':
        return 'badge-warning';
      case 'Em Produção':
        return 'badge-info';
      case 'Entregue / Concluído':
        return 'badge-success';
      default:
        return 'badge-info';
    }
  };

  const getStatusSelectStyle = (status) => {
    const base = {
      padding: '5px 10px',
      fontSize: '0.78rem',
      fontWeight: 700,
      borderRadius: '999px',
      width: 'auto',
      cursor: 'pointer',
      colorScheme: 'dark',
      outline: 'none',
      borderWidth: '1px',
      borderStyle: 'solid'
    };

    switch (status) {
      case 'Pronto para Entrega':
        return {
          ...base,
          background: '#0d2822',
          borderColor: 'rgba(16, 185, 129, 0.55)',
          color: '#34d399'
        };
      case 'Em Produção':
        return {
          ...base,
          background: '#13233a',
          borderColor: 'rgba(59, 130, 246, 0.45)',
          color: '#60a5fa'
        };
      case 'Aguardando Bordado':
        return {
          ...base,
          background: '#281d0e',
          borderColor: 'rgba(245, 158, 11, 0.5)',
          color: '#fbbf24'
        };
      case 'Entregue / Concluído':
        return {
          ...base,
          background: '#122e24',
          borderColor: 'rgba(16, 185, 129, 0.5)',
          color: '#10b981'
        };
      default:
        return {
          ...base,
          background: '#172033',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          color: '#fff'
        };
    }
  };

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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
            Pedidos de Venda & Produção
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Gerencie o chão de fábrica, acompanhe peças na esteira de oficinas parceiras e emita fichas técnicas de montagem.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={onOpenNovaVenda}>
          <Plus size={16} /> Lançar Venda Direta
        </button>
      </div>

      {/* Filtros */}
      {/* Barra de Filtros Responsiva */}
      <div className="view-filter-bar">
        <div className="view-filter-search">
          <input
            type="text"
            className="form-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, pedido # ou WhatsApp..."
            style={{ paddingLeft: '38px', padding: '9px 12px 9px 38px', fontSize: '0.875rem' }}
          />
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div className="status-pills-group">
          <span className="status-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
          {['Todos', 'Em Produção', 'Aguardando Bordado', 'Pronto para Entrega', 'Entregue / Concluído'].map((st) => (
            <button
              key={st}
              type="button"
              className={`btn btn-sm ${filtroStatus === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFiltroStatus(st)}
              style={{ fontSize: '0.78rem' }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Pedidos */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Carregando pedidos de venda...
          </div>
        ) : vendasFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
            <ShoppingBag size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>Nenhum pedido encontrado</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              {busca || filtroStatus !== 'Todos' ? 'Ajuste os filtros de pesquisa.' : 'Lançamentos de vendas ou orçamentos aprovados aparecerão aqui.'}
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th># Pedido</th>
                  <th>Cliente</th>
                  <th>Data Venda</th>
                  <th>Previsão Entrega</th>
                  <th>Peças na Esteira</th>
                  <th>Valor Total</th>
                  <th>Status Produção</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendasFiltradas.map((v) => {
                  const temOrdensEsteira = v.total_ordens_bordado > 0;
                  return (
                    <tr key={v.id}>
                      <td>
                        <strong style={{ color: 'var(--accent-gold)' }}>Pedido #{v.id}</strong>
                        {v.orcamento_id && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            (de Orç. #{v.orcamento_id})
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{v.cliente_nome_snap}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {v.cliente_whatsapp_snap || 'Sem WhatsApp'}
                        </div>
                      </td>
                      <td>{formatDate(v.data_venda)}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#fff' }}>
                          {formatDate(v.previsao_entrega)}
                        </span>
                      </td>
                      <td>
                        {temOrdensEsteira ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Scissors size={14} color="var(--accent-gold)" />
                              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                {v.bordados_recebidos} / {v.total_ordens_bordado} recebidas
                              </span>
                            </div>
                            {v.bordados_atrasados > 0 && (
                              <span className="badge badge-danger-animated" style={{ marginTop: '4px', fontSize: '0.7rem' }}>
                                ⚠️ {v.bordados_atrasados} em atraso
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                            Sem terceirização
                          </span>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: '#fff', fontSize: '0.95rem' }}>
                          {formatMoney(v.total_venda)}
                        </strong>
                      </td>
                      <td>
                        {/* Seletor Rápido de Status (RF012) */}
                        <select
                          className="form-select"
                          value={v.status_producao}
                          onChange={(e) => atualizarStatusVenda(v.id, e.target.value)}
                          style={getStatusSelectStyle(v.status_producao)}
                        >
                          <option value="Em Produção" style={{ background: '#172033', color: '#60a5fa' }}>Em Produção</option>
                          <option value="Aguardando Bordado" style={{ background: '#172033', color: '#fbbf24' }}>Aguardando Bordado</option>
                          <option value="Pronto para Entrega" style={{ background: '#172033', color: '#34d399' }}>Pronto para Entrega</option>
                          <option value="Entregue / Concluído" style={{ background: '#172033', color: '#10b981' }}>Entregue / Concluído</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => abrirFichaProducao(v.id)}
                          title="Imprimir Ficha Técnica de Produção (RF013)"
                        >
                          <Printer size={14} /> Ficha Técnica
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ficha Técnica de Produção (RF013) */}
      {vendaSelecionada && (
        <FichaProducaoModal
          venda={vendaSelecionada}
          onClose={() => setVendaSelecionada(null)}
        />
      )}
    </div>
  );
}
