import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Eye, CheckCircle2, MessageCircle, 
  Calendar, Clock, User, Filter, AlertCircle
} from 'lucide-react';
import VisualizacaoPropostaModal from './VisualizacaoPropostaModal';

export default function OrcamentosView({ onOpenNovoOrcamento }) {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState(null);
  const [detalheLoading, setDetalheLoading] = useState(false);

  const carregarOrcamentos = () => {
    setLoading(true);
    fetch('/api/orcamentos')
      .then(res => res.json())
      .then(data => {
        setOrcamentos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    carregarOrcamentos();
  }, []);

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Abrir detalhes com itens para proposta A4 / WhatsApp
  const abrirProposta = async (id) => {
    setDetalheLoading(true);
    try {
      const res = await fetch(`/api/orcamentos/${id}`);
      const data = await res.json();
      setOrcamentoSelecionado(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetalheLoading(false);
    }
  };

  // RF010: Conversão em Venda (1 Clique)
  const converterEmVenda = async (id) => {
    if (!window.confirm(`Confirma aprovação do Orçamento #${id} e despacho imediato das peças para a produção e Esteira de oficinas?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/orcamentos/${id}/converter`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        carregarOrcamentos();
        if (orcamentoSelecionado && orcamentoSelecionado.id === id) {
          setOrcamentoSelecionado(null);
        }
      } else {
        alert(data.error || 'Erro ao converter orçamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha na requisição.');
    }
  };

  // Filtragem
  const orcamentosFiltrados = orcamentos.filter(o => {
    const matchStatus = filtroStatus === 'Todos' || o.status === filtroStatus;
    const matchBusca = busca === '' || 
      o.cliente_nome_snap.toLowerCase().includes(busca.toLowerCase()) ||
      String(o.id).includes(busca) ||
      (o.cliente_whatsapp_snap && o.cliente_whatsapp_snap.includes(busca));
    return matchStatus && matchBusca;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header com Busca & Ação */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
            Orçamentos & Propostas Comerciais
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Emita propostas personalizadas, visualize propostas em formato A4 e converta em vendas com 1 clique.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={onOpenNovoOrcamento}>
          <Plus size={16} /> Emitir Novo Orçamento
        </button>
      </div>

      {/* Barra de Filtros Responsiva */}
      <div className="view-filter-bar">
        {/* Campo de Busca */}
        <div className="view-filter-search">
          <input
            type="text"
            className="form-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, WhatsApp ou # da proposta..."
            style={{ paddingLeft: '38px', padding: '9px 12px 9px 38px', fontSize: '0.875rem' }}
          />
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Filtro de Status */}
        <div className="status-pills-group">
          <span className="status-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
          {['Todos', 'Pendente', 'Aprovado', 'Recusado'].map((st) => (
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

      {/* Listagem em Tabela Responsiva */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Carregando orçamentos...
          </div>
        ) : orcamentosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
            <FileText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>Nenhum orçamento encontrado</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              {busca || filtroStatus !== 'Todos' ? 'Tente ajustar os filtros de busca.' : 'Clique em "Emitir Novo Orçamento" para começar.'}
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th># Proposta</th>
                  <th>Cliente</th>
                  <th>Data Emissão</th>
                  <th>Validade</th>
                  <th>Itens</th>
                  <th>Valor Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orcamentosFiltrados.map((orc) => {
                  const isAprovado = orc.status === 'Aprovado';
                  return (
                    <tr key={orc.id}>
                      <td>
                        <strong style={{ color: 'var(--accent-gold)' }}>#{orc.id}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{orc.cliente_nome_snap}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {orc.cliente_whatsapp_snap || 'Sem WhatsApp'}
                        </div>
                      </td>
                      <td>{formatDate(orc.data_criacao)}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          {orc.validade_dias} dias
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {orc.total_itens} {orc.total_itens === 1 ? 'item' : 'itens'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#fff', fontSize: '0.95rem' }}>
                          {formatMoney(orc.total_geral)}
                        </strong>
                        {orc.lucro_total > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600, marginTop: '2px' }}>
                            Lucro: {formatMoney(orc.lucro_total)}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${isAprovado ? 'badge-success' : orc.status === 'Recusado' ? 'badge-danger' : 'badge-warning'}`}>
                          {orc.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => abrirProposta(orc.id)}
                            title="Visualizar Proposta A4 / Imprimir PDF (RF008)"
                          >
                            <Eye size={14} /> Ver Proposta
                          </button>

                          {!isAprovado && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => converterEmVenda(orc.id)}
                              title="Aprovar e Converter em Venda (RF010)"
                            >
                              <CheckCircle2 size={14} /> Aprovar & Gerar OS
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Visualização da Proposta Comercial A4 (RF008, RF009) */}
      {orcamentoSelecionado && (
        <VisualizacaoPropostaModal
          orcamento={orcamentoSelecionado}
          onClose={() => setOrcamentoSelecionado(null)}
          onConverterVenda={converterEmVenda}
        />
      )}
    </div>
  );
}
