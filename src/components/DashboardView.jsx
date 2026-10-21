import React, { useState, useEffect } from 'react';
import { 
  DollarSign, ShoppingBag, FileSpreadsheet, Truck, AlertTriangle, 
  Clock, CheckCircle, MessageCircle, ArrowUpRight, TrendingUp, Calendar, 
  Scissors, Plus, Filter, CreditCard, PieChart, BarChart3, RefreshCw
} from 'lucide-react';

export default function DashboardView({ onOpenNovoOrcamento, onOpenNovaVenda, onNavigateTab }) {
  // Filtros de Tempo e Intervalo
  const [periodoPreset, setPeriodoPreset] = useState('mes'); // 'hoje', '7d', '30d', 'mes', 'ano', 'tudo', 'custom'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);

  // Helper de cálculo de datas para os presets
  const calcularDatasPreset = (preset) => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    const fimStr = formatDate(today);
    let inicioStr = '';

    if (preset === 'hoje') {
      inicioStr = fimStr;
    } else if (preset === '7d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      inicioStr = formatDate(d);
    } else if (preset === '30d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      inicioStr = formatDate(d);
    } else if (preset === 'mes') {
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      inicioStr = `${y}-${m}-01`;
    } else if (preset === 'ano') {
      const y = today.getFullYear();
      inicioStr = `${y}-01-01`;
    } else if (preset === 'tudo') {
      inicioStr = '';
    }

    return { inicioStr, fimStr };
  };

  const handleSelectPreset = (preset) => {
    setPeriodoPreset(preset);
    if (preset !== 'custom') {
      const { inicioStr, fimStr } = calcularDatasPreset(preset);
      setDataInicio(inicioStr);
      setDataFim(preset === 'tudo' ? '' : fimStr);
    }
  };

  const loadDashboard = (dtIni = dataInicio, dtFim = dataFim) => {
    setLoading(true);
    let url = '/api/dashboard';
    const params = [];
    if (dtIni) params.push(`data_inicio=${dtIni}`);
    if (dtFim) params.push(`data_fim=${dtFim}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    fetch(url)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  // Carregar inicial
  useEffect(() => {
    const { inicioStr, fimStr } = calcularDatasPreset('mes');
    setDataInicio(inicioStr);
    setDataFim(fimStr);
    loadDashboard(inicioStr, fimStr);
  }, []);

  // Quando datas mudam
  useEffect(() => {
    if (dataInicio || dataFim || periodoPreset === 'tudo') {
      loadDashboard(dataInicio, dataFim);
    }
  }, [dataInicio, dataFim, periodoPreset]);

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // RF016: Cobrança Rápida do Fornecedor via WhatsApp (Seção 7.2 do Escopo)
  const cobrarFornecedorWhatsApp = (item) => {
    const msg = `Olá, ${item.nome_oficina}! Tudo bem?

Gostaríamos de acompanhar a Ordem #${item.id} referente ao nosso Pedido #${item.venda_id}:
• Peça: ${item.peca_descricao}
• Bordado: ${item.detalhe_personalizacao || 'Conforme especificado'}
• Prazo acordado de retorno: ${formatDate(item.previsao_retorno)}

Conseguem nos confirmar se as peças já estão prontas para coleta? Obrigado!`;

    const phoneDigits = (item.fornecedor_whatsapp || '').replace(/\D/g, '');
    const fullPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // RF017: Baixa de Retorno Rápida direto do Dashboard
  const darBaixaRetorno = async (osId) => {
    if (!window.confirm('Confirmar retorno da peça finalizada pela oficina?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/ordens-bordado/${osId}/baixa`, { method: 'PATCH' });
      const resData = await res.json();
      if (res.ok) {
        if (resData.venda_atualizada_pronto) {
          alert('🎉 Todas as peças foram recebidas! O Pedido de Venda foi atualizado automaticamente para "Pronto para Entrega"!');
        }
        loadDashboard();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const { kpis, retornos_criticos, graficos } = data || {};

  // Cálculos para o gráfico de evolução
  const evolucaoData = graficos?.evolucao_faturamento || [];
  const maxFaturamento = Math.max(...evolucaoData.map(d => d.total), 1000);

  // Cálculos para o gráfico de donut de bordados
  const statusBord = graficos?.status_bordados || { no_prazo: 0, em_atraso: 0, recebidos: 0 };
  const totalPecasBord = (statusBord.no_prazo || 0) + (statusBord.em_atraso || 0) + (statusBord.recebidos || 0);
  const pctRecebidos = totalPecasBord > 0 ? Math.round((statusBord.recebidos / totalPecasBord) * 100) : 0;
  const pctAtrasados = totalPecasBord > 0 ? Math.round((statusBord.em_atraso / totalPecasBord) * 100) : 0;
  const pctNoPrazo = totalPecasBord > 0 ? Math.round((statusBord.no_prazo / totalPecasBord) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner de Ações Rápidas */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(23, 32, 51, 0.9) 0%, rgba(16, 22, 35, 0.95) 100%)',
        border: '1px solid var(--bg-card-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>🏇</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
              Painel de Gestão & Operação
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Acompanhe vendas, gráficos analíticos e a esteira de produção e terceirizados em tempo real.
          </p>
        </div>

        <div className="dashboard-hero-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onOpenNovaVenda}
          >
            <ShoppingBag size={16} /> Nova Venda Direta
          </button>

          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onOpenNovoOrcamento}
          >
            <Plus size={16} /> Novo Orçamento (Balcão)
          </button>
        </div>
      </div>

      {/* BARRA DE FILTRO DE TEMPO E INTERVALO (NOVO RECURSO) */}
      <div style={{
        background: 'rgba(16, 22, 35, 0.85)',
        border: '1px solid var(--bg-card-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.85rem' }}>
            <Calendar size={18} /> Filtrar Período:
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: '7d', label: '7 Dias' },
              { id: '30d', label: '30 Dias' },
              { id: 'mes', label: 'Este Mês' },
              { id: 'ano', label: 'Este Ano' },
              { id: 'tudo', label: 'Todo o Histórico' },
              { id: 'custom', label: 'Personalizado' }
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                className={`btn btn-sm ${periodoPreset === preset.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleSelectPreset(preset.id)}
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs de Data Personalizada se selecionado */}
        {periodoPreset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>De:</span>
              <input
                type="date"
                className="form-input"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Até:</span>
              <input
                type="date"
                className="form-input"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => loadDashboard()}
              title="Recarregar período"
            >
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>
        )}

        {periodoPreset !== 'custom' && dataInicio && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Exibindo dados de <strong>{formatDate(dataInicio)}</strong> {dataFim ? `até ${formatDate(dataFim)}` : ''}
          </div>
        )}
      </div>

      {/* Grid de KPIs do Período */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {/* KPI 1: Faturamento do Período */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Faturamento do Período</div>
            <div className="kpi-value">{formatMoney(kpis?.faturamento_periodo ?? kpis?.faturamento_mes)}</div>
            <div className="kpi-subtext">
              {kpis?.pedidos_periodo ?? kpis?.pedidos_mes} {((kpis?.pedidos_periodo ?? kpis?.pedidos_mes) === 1) ? 'pedido fechado' : 'pedidos fechados'}
            </div>
          </div>
          <div className="kpi-icon-wrapper">
            <DollarSign size={22} />
          </div>
        </div>

        {/* KPI 2: Custo Total de Produção */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Custo de Produção</div>
            <div className="kpi-value" style={{ color: '#cbd5e1' }}>
              {formatMoney(kpis?.custo_periodo ?? kpis?.custo_mes ?? 0)}
            </div>
            <div className="kpi-subtext">
              Peças, confecção e oficinas
            </div>
          </div>
          <div className="kpi-icon-wrapper" style={{ color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.3)', background: 'rgba(148, 163, 184, 0.1)' }}>
            <CreditCard size={22} />
          </div>
        </div>

        {/* KPI 3: Lucro Líquido Real & Margem */}
        <div className="kpi-card" style={{ borderColor: 'rgba(52, 211, 153, 0.35)', background: 'linear-gradient(145deg, rgba(23, 32, 51, 0.8) 0%, rgba(6, 78, 59, 0.25) 100%)' }}>
          <div>
            <div className="kpi-label" style={{ color: '#6ee7b7' }}>Lucro Líquido Real</div>
            <div className="kpi-value" style={{ color: '#34d399' }}>
              {formatMoney(kpis?.lucro_periodo ?? kpis?.lucro_mes ?? 0)}
            </div>
            <div className="kpi-subtext" style={{ color: '#a7f3d0', fontWeight: 600 }}>
              📈 {(kpis?.margem_periodo ?? kpis?.margem_mes ?? 0)}% de margem líquida
            </div>
          </div>
          <div className="kpi-icon-wrapper" style={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.4)', background: 'rgba(52, 211, 153, 0.18)' }}>
            <TrendingUp size={22} />
          </div>
        </div>

        {/* KPI 4: Ticket Médio do Período */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Ticket Médio</div>
            <div className="kpi-value">{formatMoney(kpis?.ticket_medio || 0)}</div>
            <div className="kpi-subtext">
              Por pedido faturado no intervalo
            </div>
          </div>
          <div className="kpi-icon-wrapper" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.12)' }}>
            <DollarSign size={22} />
          </div>
        </div>

        {/* KPI 5: Peças no Fornecedor */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Peças em Oficinas</div>
            <div className="kpi-value">{kpis?.pecas_no_fornecedor || 0}</div>
            <div className="kpi-subtext">
              Em confecção ou bordado externo
            </div>
          </div>
          <div className="kpi-icon-wrapper" style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.3)', background: 'rgba(167, 139, 250, 0.12)' }}>
            <Scissors size={22} />
          </div>
        </div>

        {/* KPI 6: Alertas em Atraso */}
        <div className={`kpi-card ${kpis?.bordados_atrasados > 0 ? 'alert-card' : ''}`}>
          <div>
            <div className="kpi-label" style={{ color: kpis?.bordados_atrasados > 0 ? 'var(--danger-text)' : undefined }}>
              Bordados em Atraso
            </div>
            <div className="kpi-value" style={{ color: kpis?.bordados_atrasados > 0 ? 'var(--danger-text)' : undefined }}>
              {kpis?.bordados_atrasados || 0}
            </div>
            <div className="kpi-subtext">
              {kpis?.bordados_atrasados > 0 ? 'Exigem cobrança no WhatsApp' : 'Nenhuma peça atrasada'}
            </div>
          </div>
          <div className="kpi-icon-wrapper">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* SEÇÃO DE CHARTS ANALÍTICOS (GRÁFICO 1 E GRÁFICO 2) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {/* CHART 1: EVOLUÇÃO DE FATURAMENTO NO PERÍODO */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div className="card-title">
                <BarChart3 size={18} color="var(--accent-gold)" /> Evolução do Faturamento & Lucro
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                {evolucaoData.length} {evolucaoData.length === 1 ? 'dia com vendas' : 'dias com vendas'}
              </span>
            </div>

            {evolucaoData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
                Nenhuma venda registrada no intervalo de tempo selecionado.
              </div>
            ) : (
              <div style={{ position: 'relative', marginTop: '10px' }}>
                {/* Gráfico de Barras SVG */}
                <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '12px', paddingBottom: '28px', borderBottom: '1px solid var(--bg-card-border)' }}>
                  {evolucaoData.map((item, idx) => {
                    const alturaPct = Math.max(15, Math.round((item.total / maxFaturamento) * 100));
                    const isHovered = hoveredBar === idx;

                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          flex: 1, 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'flex-end', 
                          alignItems: 'center',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Tooltip no Hover com Faturamento, Custo e Lucro */}
                        {isHovered && (
                          <div style={{
                            position: 'absolute',
                            bottom: `calc(${alturaPct}% + 12px)`,
                            background: '#0f172a',
                            border: '1px solid var(--accent-gold)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                            zIndex: 20,
                            pointerEvents: 'none'
                          }}>
                            <div style={{ color: '#fff', fontWeight: 700 }}>
                              Faturamento: {formatMoney(item.total)}
                            </div>
                            {item.custo !== undefined && (
                              <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                Custo de Produção: {formatMoney(item.custo)}
                              </div>
                            )}
                            {item.lucro !== undefined && (
                              <div style={{ color: item.lucro >= 0 ? '#34d399' : '#f87171', fontWeight: 700, fontSize: '0.74rem' }}>
                                Lucro Líquido: {formatMoney(item.lucro)}
                              </div>
                            )}
                            <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '3px' }}>
                              {item.pedidos} {item.pedidos === 1 ? 'pedido' : 'pedidos'} em {formatDate(item.data)}
                            </div>
                          </div>
                        )}

                        {/* Valor acima da barra */}
                        <div style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: isHovered ? 'var(--accent-gold)' : 'var(--text-dim)',
                          marginBottom: '6px'
                        }}>
                          {item.total >= 1000 ? `R$ ${(item.total / 1000).toFixed(1)}k` : `R$ ${item.total}`}
                        </div>

                        {/* Barra */}
                        <div style={{
                          width: '100%',
                          maxWidth: '44px',
                          height: `${alturaPct}%`,
                          background: isHovered 
                            ? 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)' 
                            : 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)',
                          borderRadius: '6px 6px 2px 2px',
                          boxShadow: isHovered ? '0 0 16px var(--accent-glow)' : 'none',
                          transition: 'all 0.2s ease'
                        }} />

                        {/* Rótulo da Data embaixo */}
                        <div style={{
                          position: 'absolute',
                          bottom: '-24px',
                          fontSize: '0.68rem',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.data.split('-').slice(1).reverse().join('/')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid var(--bg-card-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Total faturado no gráfico:</span>
            <strong style={{ color: 'var(--accent-gold)' }}>
              {formatMoney(evolucaoData.reduce((acc, curr) => acc + curr.total, 0))}
            </strong>
          </div>
        </div>

        {/* CHART 2: VENDAS POR FORMA DE PAGAMENTO */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div className="card-title">
                <CreditCard size={18} color="var(--accent-gold)" /> Vendas por Forma de Pagamento
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                Condições Comerciais
              </span>
            </div>

            {(!graficos?.formas_pagamento || graficos.formas_pagamento.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
                Nenhuma venda registrada no período para cálculo de formas de pagamento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
                {graficos.formas_pagamento.map((item, idx) => {
                  const totalGeralPeriodo = kpis?.faturamento_periodo || 1;
                  const pct = Math.round((item.total / totalGeralPeriodo) * 100);

                  const getCor = (metodo) => {
                    if (metodo.includes('Pix')) return '#10b981';
                    if (metodo.includes('Crédito')) return '#f59e0b';
                    if (metodo.includes('Débito')) return '#38bdf8';
                    if (metodo.includes('Boleto')) return '#a855f7';
                    return '#94a3b8';
                  };

                  const cor = getCor(item.metodo);

                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cor }} />
                          {item.metodo} ({item.count} {item.count === 1 ? 'venda' : 'vendas'})
                        </span>
                        <span style={{ fontWeight: 700, color: '#fff' }}>
                          {formatMoney(item.total)} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>({pct}%)</span>
                        </span>
                      </div>

                      {/* Barra de Progresso */}
                      <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: '999px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--bg-card-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Total de transações:</span>
            <strong style={{ color: '#fff' }}>
              {(graficos?.formas_pagamento || []).reduce((acc, curr) => acc + curr.count, 0)} vendas
            </strong>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE CHARTS: BORDADOS TERCEIRIZADOS E OFICINAS PARCEIRAS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* CHART 3: STATUS DOS BORDADOS TERCEIRIZADOS (DONUT / METER) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Scissors size={18} color="var(--accent-gold)" /> Fluxo de Peças na Esteira
            </div>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('bordados')}
            >
              Ver Esteira <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="donut-metric-card-content">
            {/* Medidor Donut SVG */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="3.8"
                />
                {/* Recebidos (Verde) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.8"
                  strokeDasharray={`${pctRecebidos}, 100`}
                />
                {/* Atrasados (Vermelho) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3.8"
                  strokeDasharray={`${pctAtrasados}, 100`}
                  strokeDashoffset={`-${pctRecebidos}`}
                />
              </svg>

              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                  {totalPecasBord}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Peças Totais
                </span>
              </div>
            </div>

            {/* Legenda e Métricas */}
            <div className="donut-metric-legend" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--danger-text)', fontWeight: 600 }}>
                  🚨 Em Atraso
                </span>
                <strong style={{ color: 'var(--danger-text)', fontSize: '0.95rem' }}>
                  {statusBord.em_atraso || 0} ({pctAtrasados}%)
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--warning-text)', fontWeight: 600 }}>
                  ⏰ No Prazo
                </span>
                <strong style={{ color: 'var(--warning-text)', fontSize: '0.95rem' }}>
                  {statusBord.no_prazo || 0} ({pctNoPrazo}%)
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--success-text)', fontWeight: 600 }}>
                  ✅ Recebidos
                </span>
                <strong style={{ color: 'var(--success-text)', fontSize: '0.95rem' }}>
                  {statusBord.recebidos || 0} ({pctRecebidos}%)
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* CHART 4: PEÇAS ALOCADAS POR OFICINA PARCEIRA */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Truck size={18} color="var(--accent-gold)" /> Carga de Trabalho por Oficina
            </div>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('fornecedores')}
            >
              Ver Oficinas <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(graficos?.top_oficinas || []).map((oficina, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(16, 22, 35, 0.6)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--bg-card-border)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                    {oficina.nome_oficina}
                  </div>
                  {oficina.pecas_atrasadas > 0 && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--danger-text)', fontWeight: 700 }}>
                      ⚠️ {oficina.pecas_atrasadas} em atraso
                    </span>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-info" style={{ fontWeight: 700 }}>
                    {oficina.pecas_ativas} {oficina.pecas_ativas === 1 ? 'peça ativa' : 'peças ativas'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RF022: Tabela de Retornos Críticos (Hoje e em Atraso) */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title" style={{ color: '#fff' }}>
              <Clock size={18} color={retornos_criticos?.length ? 'var(--danger-text)' : 'var(--accent-gold)'} />
              Retornos Críticos na Esteira (Em Atraso & Hoje)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Peças que exigem atenção imediata para evitar atrasos na entrega final ao cliente.
            </p>
          </div>
        </div>

        {(!retornos_criticos || retornos_criticos.length === 0) ? (
          <div style={{
            textAlign: 'center',
            padding: '36px',
            color: 'var(--text-dim)',
            background: 'rgba(16, 22, 35, 0.4)',
            borderRadius: 'var(--radius-md)'
          }}>
            <CheckCircle size={32} color="var(--success-text)" style={{ margin: '0 auto 8px auto' }} />
            <div>Excelente! Nenhuma peça em atraso ou vencendo hoje nas oficinas parceiras.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status / Urgência</th>
                  <th>OS / Pedido</th>
                  <th>Peça & Personalização</th>
                  <th>Oficina Parceira</th>
                  <th>Previsão Retorno</th>
                  <th style={{ textAlign: 'right' }}>Ações Rápidas</th>
                </tr>
              </thead>
              <tbody>
                {retornos_criticos.map((os) => {
                  const isAtrasado = os.urgencia === 'Em Atraso';
                  return (
                    <tr key={os.id}>
                      <td>
                        <span className={`badge ${isAtrasado ? 'badge-danger-animated' : 'badge-warning'}`}>
                          {isAtrasado ? `⚠️ ${Math.abs(os.dias_restantes)}d em atraso` : '⏰ Retorno Hoje'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff' }}>OS #{os.id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Pedido #{os.venda_id} ({os.cliente_nome_snap})</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{os.peca_descricao}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                          🧵 {os.detalhe_personalizacao}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{os.nome_oficina}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{os.fornecedor_whatsapp}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: isAtrasado ? 'var(--danger-text)' : 'var(--warning-text)' }}>
                          {formatDate(os.previsao_retorno)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-whatsapp btn-sm"
                            onClick={() => cobrarFornecedorWhatsApp(os)}
                            title="Cobrar Fornecedor via WhatsApp (RF016)"
                          >
                            <MessageCircle size={14} /> Cobrar WhatsApp
                          </button>

                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => darBaixaRetorno(os.id)}
                            disabled={actionLoading}
                            title="Dar baixa no retorno da peça (RF017)"
                          >
                            <CheckCircle size={14} /> Dar Baixa
                          </button>
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
