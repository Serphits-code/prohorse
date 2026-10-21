import React, { useState, useEffect } from 'react';
import { 
  Scissors, MessageCircle, CheckCircle, Clock, AlertTriangle, 
  Search, Filter, Calendar, Building2, User, Sparkles, X, Loader2,
  Layers, Package, ArrowUpRight, RotateCcw, Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BordadosView() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('Ativas'); // 'Todas', 'Ativas', 'Atrasadas', 'SemPrazo', 'Recebidas'
  const [filtroTipo, setFiltroTipo] = useState('Todos'); // 'Todos', 'Fabricação / Peça', 'Personalização / Bordado'
  const [filtroOficina, setFiltroOficina] = useState('Todas');
  const [busca, setBusca] = useState('');
  const [fornecedores, setFornecedores] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const carregarOrdens = () => {
    setLoading(true);
    fetch('/api/ordens-bordado')
      .then(res => res.json())
      .then(data => {
        setOrdens(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    carregarOrdens();
    fetch('/api/fornecedores')
      .then(res => res.json())
      .then(setFornecedores)
      .catch(console.error);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Cobrança Rápida do Fornecedor via WhatsApp adaptada por tipo de serviço
  const cobrarFornecedorWhatsApp = (os) => {
    const isFabricacao = os.tipo_servico === 'Fabricação / Peça';
    const acaoTipo = isFabricacao ? 'confecção da peça' : 'personalização / bordado';
    const detalheLabel = isFabricacao ? 'Especificações' : 'Bordado';
    const prazoStr = (os.tem_prazo && os.previsao_retorno) 
      ? `• Prazo acordado de retorno: ${formatDate(os.previsao_retorno)}`
      : '• Prazo de entrega: A combinar';

    const msg = `Olá, ${os.nome_oficina}! Tudo bem?

Gostaríamos de acompanhar a ${acaoTipo} da Ordem #${os.id} referente ao nosso Pedido #${os.venda_id}:
• Peça: ${os.peca_descricao}
• ${detalheLabel}: ${os.detalhe_personalizacao || 'Conforme combinado'}
${prazoStr}

Conseguem nos confirmar a previsão ou se as peças já estão prontas para coleta? Obrigado!`;

    const phoneDigits = (os.fornecedor_whatsapp || '').replace(/\D/g, '');
    const fullPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Baixa de Retorno na Esteira com Conclusão Automática da Venda
  const darBaixaRetorno = async (osId) => {
    setActionLoadingId(osId);
    try {
      const res = await fetch(`/api/ordens-bordado/${osId}/baixa`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok) {
        if (data.venda_atualizada_pronto) {
          try {
            confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
          } catch (e) {}
          setToastMsg({
            type: 'concluido',
            text: `🎉 Baixa concluída na OS #${osId}! Todas as peças do Pedido #${data.venda_id} retornaram!`,
            subtext: `O Pedido #${data.venda_id} avançou automaticamente para o status "Pronto para Entrega".`
          });
        } else {
          setToastMsg({
            type: 'success',
            text: `✅ Baixa da OS #${osId} registrada com sucesso!`,
            subtext: `A peça foi transferida para "Recebidas". Clique na aba "Recebidas" para conferir.`
          });
        }
        carregarOrdens();
      } else {
        setToastMsg({
          type: 'error',
          text: `Erro ao registrar baixa: ${data.error || 'Tente novamente.'}`
        });
      }
    } catch (err) {
      console.error(err);
      setToastMsg({
        type: 'error',
        text: 'Falha na comunicação com o servidor ao registrar baixa.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reabrir ordem caso tenha sido marcada por engano
  const reabrirOrdem = async (osId) => {
    setActionLoadingId(osId);
    try {
      const res = await fetch(`/api/ordens-bordado/${osId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_ordem: 'No Fornecedor' })
      });
      if (res.ok) {
        setToastMsg({
          type: 'info',
          text: `🔄 OS #${osId} reaberta com sucesso!`,
          subtext: `A ordem retornou para a lista "Na Oficina".`
        });
        carregarOrdens();
      }
    } catch (e) {
      console.error(e);
      setToastMsg({
        type: 'error',
        text: 'Erro ao reabrir ordem de serviço.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtragem
  const ordensFiltradas = ordens.filter(os => {
    // Filtro por tab de status
    let matchTab = true;
    const hasPrazo = os.tem_prazo === 1 && os.previsao_retorno;

    if (filtroStatus === 'Ativas') {
      matchTab = os.status_ordem === 'No Fornecedor';
    } else if (filtroStatus === 'Atrasadas') {
      matchTab = os.status_ordem === 'No Fornecedor' && os.is_atrasada === 1;
    } else if (filtroStatus === 'SemPrazo') {
      matchTab = os.status_ordem === 'No Fornecedor' && (!os.tem_prazo || !os.previsao_retorno);
    } else if (filtroStatus === 'Recebidas') {
      matchTab = os.status_ordem === 'Pronto / Recebido';
    }

    // Filtro por tipo de serviço
    let matchTipo = true;
    if (filtroTipo === 'Fabricação / Peça') {
      matchTipo = os.tipo_servico === 'Fabricação / Peça';
    } else if (filtroTipo === 'Personalização / Bordado') {
      matchTipo = os.tipo_servico === 'Personalização / Bordado' || os.tipo_servico === 'Bordado';
    }

    // Filtro por oficina
    const matchOficina = filtroOficina === 'Todas' || String(os.fornecedor_id) === filtroOficina;

    // Busca textual
    const matchBusca = busca === '' ||
      os.peca_descricao.toLowerCase().includes(busca.toLowerCase()) ||
      (os.detalhe_personalizacao && os.detalhe_personalizacao.toLowerCase().includes(busca.toLowerCase())) ||
      os.nome_oficina.toLowerCase().includes(busca.toLowerCase()) ||
      os.cliente_nome_snap.toLowerCase().includes(busca.toLowerCase()) ||
      String(os.id).includes(busca) ||
      String(os.venda_id).includes(busca);

    return matchTab && matchTipo && matchOficina && matchBusca;
  });

  const totalAtrasadas = ordens.filter(o => o.status_ordem === 'No Fornecedor' && o.is_atrasada === 1).length;
  const totalSemPrazo = ordens.filter(o => o.status_ordem === 'No Fornecedor' && (!o.tem_prazo || !o.previsao_retorno)).length;
  const totalAtivas = ordens.filter(o => o.status_ordem === 'No Fornecedor').length;
  const totalRecebidas = ordens.filter(o => o.status_ordem === 'Pronto / Recebido').length;

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
            <Layers size={22} color="var(--accent-gold)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
              Esteira de Produção & Terceirização
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Acompanhamento centralizado de selas, produtos e bordados enviados para oficinas parceiras com controle de prazos e baixa com 1 clique.
          </p>
        </div>

        {totalAtrasadas > 0 && (
          <div className="badge badge-danger-animated" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} /> {totalAtrasadas} {totalAtrasadas === 1 ? 'item em atraso' : 'itens em atraso'} exigindo cobrança!
          </div>
        )}
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: toastMsg.type === 'concluido'
            ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(16, 185, 129, 0.25))'
            : toastMsg.type === 'success'
              ? 'rgba(16, 185, 129, 0.15)'
              : toastMsg.type === 'info'
                ? 'rgba(59, 130, 246, 0.15)'
                : 'rgba(244, 63, 94, 0.15)',
          border: `1px solid ${toastMsg.type === 'concluido' ? 'var(--accent-gold)' : toastMsg.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
          color: '#fff',
          animation: 'fade-in 0.2s ease'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{toastMsg.text}</div>
            {toastMsg.subtext && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {toastMsg.subtext}
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon btn-xs"
            onClick={() => setToastMsg(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Barra de Filtros & Busca */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          {/* Busca */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por peça, cliente, oficina, OS..."
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Filtro por Tipo de Serviço */}
          <div>
            <select
              className="form-select"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="Todos">📦 Todos os Tipos de Serviço</option>
              <option value="Fabricação / Peça">🏷️ Fabricação / Peça (Selas & Confecção)</option>
              <option value="Personalização / Bordado">🧵 Personalização / Bordado</option>
            </select>
          </div>

          {/* Filtro por Oficina */}
          <div>
            <select
              className="form-select"
              value={filtroOficina}
              onChange={(e) => setFiltroOficina(e.target.value)}
            >
              <option value="Todas">🏢 Todas as Oficinas Parceiras</option>
              {fornecedores.map(f => (
                <option key={f.id} value={String(f.id)}>{f.nome_oficina}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Abas Rápidas de Status */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${filtroStatus === 'Ativas' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltroStatus('Ativas')}
          >
            Na Oficina ({totalAtivas})
          </button>

          <button
            type="button"
            className={`btn btn-sm ${filtroStatus === 'Atrasadas' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setFiltroStatus('Atrasadas')}
          >
            🚨 Em Atraso ({totalAtrasadas})
          </button>

          <button
            type="button"
            className={`btn btn-sm ${filtroStatus === 'SemPrazo' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltroStatus('SemPrazo')}
            style={filtroStatus === 'SemPrazo' ? { background: '#475569', color: '#fff' } : {}}
          >
            🗓️ Sem Prazo ({totalSemPrazo})
          </button>

          <button
            type="button"
            className={`btn btn-sm ${filtroStatus === 'Recebidas' ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => setFiltroStatus('Recebidas')}
          >
            ✅ Recebidas ({totalRecebidas})
          </button>

          <button
            type="button"
            className={`btn btn-sm ${filtroStatus === 'Todas' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltroStatus('Todas')}
          >
            Todas ({ordens.length})
          </button>
        </div>
      </div>

      {/* Tabela da Esteira */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Carregando esteira de produção e terceirização...
          </div>
        ) : ordensFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
            <Layers size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>Nenhum item nesta visualização da Esteira</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              Produtos ou bordados terceirizados despachados para oficinas parceiras aparecem aqui automaticamente.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo / Status</th>
                  <th>OS / Pedido</th>
                  <th>Peça & Especificação</th>
                  <th>Oficina Parceira</th>
                  <th>Envio</th>
                  <th>Previsão Retorno</th>
                  <th>Retorno Real</th>
                  <th style={{ textAlign: 'right' }}>Ações na Esteira</th>
                </tr>
              </thead>
              <tbody>
                {ordensFiltradas.map((os) => {
                  const isFabricacao = os.tipo_servico === 'Fabricação / Peça';
                  const hasPrazo = (os.tem_prazo === 1 || os.tem_prazo === null) && Boolean(os.previsao_retorno);
                  const isAtrasada = os.status_ordem === 'No Fornecedor' && os.is_atrasada === 1;
                  const isRecebido = os.status_ordem === 'Pronto / Recebido';

                  return (
                    <tr 
                      key={os.id}
                      style={{
                        background: isAtrasada ? 'rgba(244, 63, 94, 0.05)' : undefined
                      }}
                    >
                      {/* Tipo e Status */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                          {isFabricacao ? (
                            <span className="badge-esteira-tipo badge-esteira-fabricacao">
                              <Package size={11} /> Fabricação / Peça
                            </span>
                          ) : (
                            <span className="badge-esteira-tipo badge-esteira-bordado">
                              <Scissors size={11} /> Personalização
                            </span>
                          )}

                          {isRecebido ? (
                            <span className="badge badge-success">
                              <CheckCircle size={12} /> Recebido
                            </span>
                          ) : !hasPrazo ? (
                            <span className="badge-sem-prazo">
                              🗓️ Sem prazo estipulado
                            </span>
                          ) : isAtrasada ? (
                            <span className="badge badge-danger-animated">
                              <AlertTriangle size={12} /> {Math.abs(os.dias_restantes)}d atrasado
                            </span>
                          ) : os.dias_restantes === 0 ? (
                            <span className="badge badge-warning">
                              <Clock size={12} /> Vence hoje!
                            </span>
                          ) : (
                            <span className="badge badge-warning">
                              <Clock size={12} /> {os.dias_restantes}d restantes
                            </span>
                          )}
                        </div>
                      </td>

                      {/* OS e Pedido */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff' }}>OS #{os.id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          Pedido #{os.venda_id}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          {os.cliente_nome_snap}
                        </div>
                      </td>

                      {/* Descrição da Peça e Trabalho */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{os.peca_descricao}</div>
                        <div style={{
                          fontSize: '0.8rem',
                          color: isFabricacao ? '#93c5fd' : 'var(--accent-gold)',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isFabricacao ? '🏷️' : '🧵'} {os.detalhe_personalizacao}
                        </div>
                        {os.custo_servico > 0 && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            Custo acordado: R$ {Number(os.custo_servico).toFixed(2).replace('.', ',')}
                          </div>
                        )}
                      </td>

                      {/* Oficina Parceira */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{os.nome_oficina}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          📱 {os.fornecedor_whatsapp}
                        </div>
                      </td>

                      {/* Envio */}
                      <td>{formatDate(os.data_envio)}</td>

                      {/* Previsão Retorno */}
                      <td>
                        {hasPrazo ? (
                          <strong style={{ color: isAtrasada ? 'var(--danger-text)' : '#fff' }}>
                            {formatDate(os.previsao_retorno)}
                          </strong>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                            A combinar
                          </span>
                        )}
                      </td>

                      {/* Retorno Real */}
                      <td>
                        {os.data_retorno_real ? (
                          <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>
                            {formatDate(os.data_retorno_real)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>Pendente</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          {!isRecebido ? (
                            <>
                              {/* Cobrança WhatsApp */}
                              <button
                                type="button"
                                className="btn btn-whatsapp btn-sm"
                                onClick={() => cobrarFornecedorWhatsApp(os)}
                                title="Cobrar Oficina no WhatsApp com mensagem inteligente"
                              >
                                <MessageCircle size={14} /> Cobrar
                              </button>

                              {/* Dar Baixa de Retorno */}
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={() => darBaixaRetorno(os.id)}
                                disabled={actionLoadingId === os.id}
                                title="Dar baixa nesta peça e transferir para Recebida"
                              >
                                {actionLoadingId === os.id ? (
                                  <Loader2 size={14} className="spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                                <span>Dar Baixa</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => reabrirOrdem(os.id)}
                              disabled={actionLoadingId === os.id}
                              title="Reabrir esta ordem para a oficina"
                            >
                              <RotateCcw size={13} /> Reabrir
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
    </div>
  );
}
