import React, { useState } from 'react';
import { X, Printer, Download, MessageCircle, CheckCircle2, Calendar, MapPin, Phone, FileText, User } from 'lucide-react';
import ProHorseLogo from './ProHorseLogo';

export default function VisualizacaoPropostaModal({ orcamento, onClose, onConverterVenda }) {
  const [gerandoPdf, setGerandoPdf] = useState(false);
  if (!orcamento) return null;

  // Formata moeda
  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formata data
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Limpa WhatsApp para link wa.me
  const cleanPhone = (phone) => {
    return (phone || '').replace(/\D/g, '');
  };

  // Parser seguro de condições de pagamento
  let condicoesArray = [];
  try {
    if (orcamento.condicoes_pagamento_json) {
      condicoesArray = typeof orcamento.condicoes_pagamento_json === 'string'
        ? JSON.parse(orcamento.condicoes_pagamento_json)
        : orcamento.condicoes_pagamento_json;
    }
  } catch (e) {}

  // Mensageria Padrão Integrada WhatsApp (Seção 7.1 do Escopo)
  const generateWhatsAppMessage = () => {
    const itensText = (orcamento.itens || []).map(item => {
      let desc = `• ${item.quantidade}x ${item.produto_nome}`;
      if (item.tem_bordado && item.bordado_detalhe) {
        desc += ` (Personalização: ${item.bordado_detalhe})`;
      }
      return desc;
    }).join('\n');

    let pagamentosText = orcamento.forma_pagamento || 'A combinar';
    if (condicoesArray.length > 0) {
      pagamentosText = condicoesArray.map(p => 
        `• ${p.forma}: ${formatMoney(p.valor)} (Vencimento: ${formatDate(p.data_vencimento)}${p.observacao ? ` - ${p.observacao}` : ''})`
      ).join('\n');
    }

    const msg = `Olá, ${orcamento.cliente_nome_snap}! Tudo bem?

Segue a proposta comercial do seu orçamento #${orcamento.id} da Selaria ProHorse:

${itensText}

Valor Total: ${formatMoney(orcamento.total_geral)}
Previsão de Entrega: ${orcamento.previsao_entrega ? formatDate(orcamento.previsao_entrega) : 'A combinar'}

Condições de Pagamento:
${pagamentosText}

O documento formal em PDF está disponível. Ficamos à disposição para confirmar o início da produção!`;

    const phoneDigits = cleanPhone(orcamento.cliente_whatsapp_snap);
    const fullPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  // Exportar diretamente para PDF baixável (com logo e todos os detalhes)
  const handleDownloadPdf = () => {
    const element = document.getElementById('printable-a4-proposal');
    if (!element) return;
    setGerandoPdf(true);

    if (window.html2pdf) {
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `Orcamento_${orcamento.id}_ProHorse_${orcamento.cliente_nome_snap.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      window.html2pdf().set(opt).from(element).save().then(() => {
        setGerandoPdf(false);
      }).catch((e) => {
        console.error(e);
        setGerandoPdf(false);
        window.print();
      });
    } else {
      setGerandoPdf(false);
      window.print();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content printable-document" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '100%', background: '#ffffff', color: '#111827' }}
      >
        {/* Barra Superior de Ações (Oculta na Impressão) */}
        <div className="no-print" style={{
          padding: '16px 24px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopLeftRadius: 'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-gold)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Proposta Comercial #{orcamento.id} — Visualização A4
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Botão Exportar PDF */}
            <button 
              type="button" 
              className="btn btn-primary btn-sm" 
              onClick={handleDownloadPdf}
              disabled={gerandoPdf}
              style={{ background: 'var(--accent-gradient)', color: '#fff' }}
              title="Baixar arquivo PDF com logo e todos os detalhes"
            >
              <Download size={15} /> {gerandoPdf ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>

            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={handlePrint}
              style={{ background: '#1e293b', color: '#fff', borderColor: '#334155' }}
              title="Imprimir em folha A4"
            >
              <Printer size={15} /> Imprimir
            </button>

            <a
              href={generateWhatsAppMessage()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-sm"
              title="Disparar no WhatsApp com 1 clique (Seção 7.1)"
            >
              <MessageCircle size={15} /> WhatsApp
            </a>

            {orcamento.status !== 'Aprovado' && onConverterVenda && (
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => onConverterVenda(orcamento.id)}
              >
                <CheckCircle2 size={15} /> Aprovar & Gerar Venda
              </button>
            )}

            <button 
              type="button" 
              className="btn btn-secondary btn-icon btn-sm" 
              onClick={onClose}
              style={{ background: '#1e293b', color: '#fff', borderColor: '#334155' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Corpo do Documento A4 Estilizado */}
        <div id="printable-a4-proposal" className="proposal-document-content">
          {/* Header da Empresa com Logo */}
          <div className="print-header-brand" style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '20px',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <div style={{ color: '#0f172a' }}>
                <ProHorseLogo height={52} textColor="#0f172a" />
              </div>
              <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '6px' }}>
                Selaria ProHorse Artigos Campeiros & Personalizados Ltda.
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Atendimento Balcão & Personalização Sob Medida
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '1.25rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.01em'
              }}>
                ORÇAMENTO #{orcamento.id}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                <strong>Data de Emissão:</strong> {formatDate(orcamento.data_criacao)}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                <strong>Validade:</strong> {orcamento.validade_dias || 10} dias
              </div>
              <div style={{
                marginTop: '6px',
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: orcamento.status === 'Aprovado' ? '#dcfce7' : '#fef3c7',
                color: orcamento.status === 'Aprovado' ? '#15803d' : '#b45309'
              }}>
                Status: {orcamento.status}
              </div>
            </div>
          </div>

          {/* Dados do Cliente (Snapshot RN001) */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px'
            }}>
              Dados do Cliente (Proposta Comercial)
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
              fontSize: '0.85rem'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Nome Completo:</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{orcamento.cliente_nome_snap}</div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>WhatsApp / Contato:</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{orcamento.cliente_whatsapp_snap || 'Não informado'}</div>
              </div>

              {orcamento.cliente_doc_snap && (
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.78rem' }}>CPF / CNPJ:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{orcamento.cliente_doc_snap}</div>
                </div>
              )}

              {orcamento.cliente_endereco_snap && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Endereço de Entrega:</span>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{orcamento.cliente_endereco_snap}</div>
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Itens e Personalizações */}
          <div className="table-responsive" style={{ marginBottom: '24px' }}>
            <table style={{
              width: '100%',
              minWidth: '540px',
              borderCollapse: 'collapse',
              fontSize: '0.875rem'
            }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '4px 0 0 0' }}>Item / Descrição</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Qtd</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Preço Base</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Bordado / Adic.</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 4px 0 0' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(orcamento.itens || []).map((item, idx) => (
                  <tr key={idx} style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.produto_nome}</div>
                      {item.tem_bordado === 1 && (
                        <div style={{
                          marginTop: '4px',
                          fontSize: '0.8rem',
                          color: '#b45309',
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>
                          <strong>🧵 Personalização:</strong> {item.bordado_detalhe || 'Conforme especificação'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{item.quantidade}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatMoney(item.preco_unitario)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: item.tem_bordado ? '#b45309' : '#94a3b8' }}>
                      {item.tem_bordado ? formatMoney(item.preco_bord_cliente) : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {formatMoney(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumo Financeiro e Condições */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '24px',
            borderTop: '2px solid #0f172a',
            paddingTop: '16px'
          }}>
            <div style={{ maxWidth: '440px', fontSize: '0.825rem', color: '#475569' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#0f172a' }}>Plano & Formas de Pagamento:</strong>
                {condicoesArray.length > 0 ? (
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {condicoesArray.map((p, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 8px',
                        background: '#f1f5f9',
                        borderRadius: '4px',
                        fontSize: '0.78rem'
                      }}>
                        <span>
                          <strong>{p.forma}:</strong> {p.observacao ? `${p.observacao} • ` : ''}Vencimento: {formatDate(p.data_vencimento)}
                        </span>
                        <strong style={{ color: '#0f172a' }}>{formatMoney(p.valor)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginTop: '2px' }}>{orcamento.forma_pagamento || 'Pix à vista ou Cartão'}</p>
                )}
              </div>
              <p style={{ marginTop: '6px' }}>
                <strong>Previsão de Entrega:</strong> {orcamento.previsao_entrega ? formatDate(orcamento.previsao_entrega) : 'A combinar'}
              </p>
              {orcamento.observacoes && (
                <p style={{ marginTop: '6px', fontStyle: 'italic' }}>
                  <strong>Observações:</strong> {orcamento.observacoes}
                </p>
              )}
            </div>

            <div style={{
              textAlign: 'right',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '14px 20px',
              minWidth: '240px'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Valor Total da Proposta
              </span>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.65rem',
                fontWeight: 800,
                color: '#0f172a',
                marginTop: '2px'
              }}>
                {formatMoney(orcamento.total_geral)}
              </div>
            </div>
          </div>

          {/* Assinatura e Rodapé na Impressão */}
          <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid #94a3b8', height: '30px', marginBottom: '6px' }}></div>
              <span>Selaria ProHorse (Vendas)</span>
            </div>

            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid #94a3b8', height: '30px', marginBottom: '6px' }}></div>
              <span>De Acordo do Cliente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
