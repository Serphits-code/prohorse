import React, { useState, useEffect } from 'react';
import { Building2, Plus, MessageCircle, Clock, Award, Scissors, AlertTriangle, X } from 'lucide-react';

export default function FornecedoresView() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoWhatsapp, setNovoWhatsapp] = useState('');
  const [novaEspecialidade, setNovaEspecialidade] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarFornecedores = () => {
    setLoading(true);
    fetch('/api/fornecedores')
      .then(res => res.json())
      .then(data => {
        setFornecedores(data);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  const abrirWhatsAppOficina = (phone, nomeOficina) => {
    const digits = (phone || '').replace(/\D/g, '');
    const full = digits.startsWith('55') ? digits : `55${digits}`;
    const msg = `Olá, equipe da ${nomeOficina}! Aqui é da Selaria ProHorse. Tudo bem?`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoWhatsapp.trim()) return;

    setSalvando(true);
    try {
      const res = await fetch('/api/fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_oficina: novoNome,
          whatsapp: novoWhatsapp,
          especialidade: novaEspecialidade
        })
      });

      if (res.ok) {
        setModalAberto(false);
        setNovoNome('');
        setNovoWhatsapp('');
        setNovaEspecialidade('');
        carregarFornecedores();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={22} color="var(--accent-gold)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
              Oficinas & Fornecedores de Bordado
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Parceiros homologados, prazos médios contratuais e volumetria de peças alocadas em tempo real.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => setModalAberto(true)}>
          <Plus size={16} /> Cadastrar Nova Oficina
        </button>
      </div>

      {/* Grid de Oficinas com Contadores Ativos (RF019) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Carregando oficinas parceiras...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginTop: '12px'
        }}>
          {fornecedores.map((f) => (
            <div 
              key={f.id} 
              className="card"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                borderColor: f.pecas_atrasadas_count > 0 ? 'rgba(244, 63, 94, 0.45)' : undefined
              }}
            >
              {/* Badge no Topo Centro (Meio Dentro e Meio Fora do Card) */}
              {f.pecas_atrasadas_count > 0 && (
                <div 
                  className="badge badge-danger-animated"
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '4px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '999px',
                    boxShadow: '0 4px 14px rgba(244, 63, 94, 0.5)',
                    whiteSpace: 'nowrap',
                    zIndex: 5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <AlertTriangle size={13} /> {f.pecas_atrasadas_count} {f.pecas_atrasadas_count === 1 ? 'peça atrasada' : 'peças atrasadas'}
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                      {f.nome_oficina}
                    </h3>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      WhatsApp: {f.whatsapp}
                    </div>
                  </div>

                  <span className="badge badge-info" style={{ gap: '4px' }}>
                    <Scissors size={12} /> Oficina Homologada
                  </span>
                </div>

                {/* Especialidades Técnicas (RF018) */}
                <div style={{
                  marginTop: '14px',
                  background: 'rgba(16, 22, 35, 0.6)',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Especialidade Técnica
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-gold)', marginTop: '2px' }}>
                    {f.especialidade || 'Geral / Bordados Diversos'}
                  </div>
                </div>
              </div>

              {/* Contadores em Tempo Real & Ação WhatsApp (Rodapé Limpo) */}
              <div style={{
                borderTop: '1px solid var(--bg-card-border)',
                paddingTop: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Scissors size={14} color="var(--accent-gold)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                    {f.pecas_ativas_count} {f.pecas_ativas_count === 1 ? 'peça ativa' : 'peças ativas'}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-whatsapp btn-sm"
                  onClick={() => abrirWhatsAppOficina(f.whatsapp, f.nome_oficina)}
                >
                  <MessageCircle size={14} /> Conversar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro de Oficina (RF018) */}
      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Cadastrar Oficina de Bordado
              </h2>
              <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setModalAberto(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCadastrar}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Nome Fantasia da Oficina *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: Bordados Haras Elite"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contato de WhatsApp (DDD + Número) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={novoWhatsapp}
                    onChange={(e) => setNovoWhatsapp(e.target.value)}
                    placeholder="Ex: 19998765432"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Especialidade Técnica / Notas</label>
                  <input
                    type="text"
                    className="form-input"
                    value={novaEspecialidade}
                    onChange={(e) => setNovaEspecialidade(e.target.value)}
                    placeholder="Ex: Couro grosso, mantas pesadas, linha metálica..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalAberto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Cadastrar Oficina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
