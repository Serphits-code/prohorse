import React from 'react';
import { X, Printer, Scissors, Calendar, User, CheckSquare } from 'lucide-react';
import ProHorseLogo from './ProHorseLogo';

export default function FichaProducaoModal({ venda, onClose }) {
  if (!venda) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content printable-document" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '100%', background: '#ffffff', color: '#111827' }}
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
          borderTopRightRadius: 'var(--radius-xl)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scissors size={18} color="var(--accent-gold)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Ficha Técnica de Produção — Pedido #{venda.id}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={handlePrint}
              style={{ background: '#1e293b', color: '#fff', borderColor: '#334155' }}
            >
              <Printer size={15} /> Imprimir Ficha de Fábrica
            </button>

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

        {/* Ficha Chão de Fábrica */}
        <div style={{ padding: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <ProHorseLogo height={44} textColor="#0f172a" />
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Ficha Interna de Fábrica & Acabamento
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '1.4rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                color: '#0f172a'
              }}>
                ORDEM #{venda.id}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                Data Venda: {formatDate(venda.data_venda)}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#b45309' }}>
                Previsão Entrega: {venda.previsao_entrega ? formatDate(venda.previsao_entrega) : 'A combinar'}
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div style={{
            background: '#f1f5f9',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.85rem'
          }}>
            <div>
              <strong>Cliente:</strong> {venda.cliente_nome_snap} ({venda.cliente_whatsapp_snap || 'Sem WhatsApp'})
            </div>
            <div>
              <strong>Status Atual:</strong> {venda.status_producao}
            </div>
          </div>

          {/* Peças e Especificações Técnicas */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px', color: '#0f172a' }}>
              1. Peças do Pedido & Checklist de Produção
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#e2e8f0', color: '#0f172a' }}>
                  <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>OK</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Item / Descrição</th>
                  <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>Qtd</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Bordado / Personalização</th>
                  <th style={{ padding: '8px', textAlign: 'left', width: '150px' }}>Oficina Parceira</th>
                </tr>
              </thead>
              <tbody>
                {(venda.itens || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <input type="checkbox" style={{ width: '16px', height: '16px' }} />
                    </td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>
                      {item.produto_nome}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>
                      {item.quantidade}
                    </td>
                    <td style={{ padding: '10px', color: item.tem_bordado ? '#b45309' : '#64748b' }}>
                      {item.tem_bordado ? (
                        <strong>🧵 {item.bordado_detalhe}</strong>
                      ) : (
                        'Sem personalização'
                      )}
                    </td>
                    <td style={{ padding: '10px', fontSize: '0.8rem' }}>
                      {item.fornecedor_nome || (item.tem_bordado ? 'Oficina pendente' : '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ordens de Terceirização Associadas (se houver) */}
          {venda.ordens_bordado && venda.ordens_bordado.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px', color: '#0f172a' }}>
                2. Rastreamento de Terceirização (Ordens de Serviço)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>OS #</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Oficina</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Envio</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Retorno Previsto</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {venda.ordens_bordado.map((os) => (
                    <tr key={os.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>OS #{os.id}</td>
                      <td style={{ padding: '8px' }}>{os.nome_oficina}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{formatDate(os.data_envio)}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{formatDate(os.previsao_retorno)}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          background: os.status_ordem === 'Pronto / Recebido' ? '#dcfce7' : '#fef3c7',
                          color: os.status_ordem === 'Pronto / Recebido' ? '#15803d' : '#b45309'
                        }}>
                          {os.status_ordem}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {venda.observacoes && (
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '20px' }}>
              <strong>Instruções do Vendedor:</strong> {venda.observacoes}
            </div>
          )}

          {/* Campo de Conclusão e Chão de Fábrica */}
          <div style={{ marginTop: '30px', borderTop: '2px dashed #cbd5e1', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
            <div>
              <span>Responsável Fábrica: _____________________</span>
            </div>
            <div>
              <span>Revisão Final & Embalagem: [  ] Aprovado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
