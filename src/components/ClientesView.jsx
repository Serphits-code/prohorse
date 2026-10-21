import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, MessageCircle, Phone, MapPin, 
  FileText, ShoppingBag, X, Calendar, DollarSign
} from 'lucide-react';

export default function ClientesView({ onEmitirOrcamentoParaCliente }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteHistorico, setClienteHistorico] = useState(null);

  // Form novo cliente
  const [novoNome, setNovoNome] = useState('');
  const [novoWhatsapp, setNovoWhatsapp] = useState('');
  const [novoEndereco, setNovoEndereco] = useState('');
  const [novoDocumento, setNovoDocumento] = useState('');
  const [novoInstagram, setNovoInstagram] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarClientes = () => {
    setLoading(true);
    fetch('/api/clientes')
      .then(res => res.json())
      .then(data => {
        setClientes(data);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const abrirWhatsAppCliente = (phone, nomeCliente) => {
    const digits = (phone || '').replace(/\D/g, '');
    const full = digits.startsWith('55') ? digits : `55${digits}`;
    const msg = `Olá, ${nomeCliente}! Tudo bem? Aqui é da Selaria ProHorse. Como podemos ajudar hoje?`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const verHistorico = async (id) => {
    try {
      const res = await fetch(`/api/clientes/${id}`);
      const data = await res.json();
      setClienteHistorico(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoWhatsapp.trim()) return;

    setSalvando(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoNome,
          whatsapp: novoWhatsapp,
          endereco: novoEndereco,
          documento: novoDocumento,
          instagram: novoInstagram
        })
      });

      if (res.ok) {
        setModalAberto(false);
        setNovoNome('');
        setNovoWhatsapp('');
        setNovoEndereco('');
        setNovoDocumento('');
        setNovoInstagram('');
        carregarClientes();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  const clientesFiltrados = clientes.filter(c => {
    return busca === '' ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.whatsapp.includes(busca) ||
      (c.documento && c.documento.includes(busca)) ||
      (c.endereco && c.endereco.toLowerCase().includes(busca.toLowerCase()));
  });

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
            <Users size={22} color="var(--accent-gold)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
              Diretório de Clientes & Haras
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Base completa de clientes, histórico de compras, ticket médio e contato instantâneo via WhatsApp.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => setModalAberto(true)}>
          <Plus size={16} /> Cadastrar Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div style={{
        background: 'rgba(16, 22, 35, 0.7)',
        padding: '14px 18px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--bg-card-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            className="form-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, WhatsApp, CPF/CNPJ, Haras, Fazenda ou Cidade..."
            style={{ paddingLeft: '38px' }}
          />
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Tabela de Clientes (RF004) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Carregando clientes...
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-dim)' }}>
            <Users size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>Nenhum cliente encontrado</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              Tente buscar por outro termo ou cadastre um novo cliente.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente / Haras</th>
                  <th>Contato WhatsApp</th>
                  <th>Localização / Endereço</th>
                  <th>CPF / CNPJ</th>
                  <th>Total Pedidos</th>
                  <th>Total Comprado</th>
                  <th style={{ textAlign: 'right' }}>Ações Rápidas</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{c.nome}</div>
                      {c.instagram && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                          {c.instagram}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{c.whatsapp}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                        {c.endereco || 'Não cadastrado'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--text-dim)' }}>
                        {c.documento || '-'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {c.total_pedidos} {c.total_pedidos === 1 ? 'pedido' : 'pedidos'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#fff' }}>
                        {formatMoney(c.total_gasto)}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {/* RF004: Link direto para WhatsApp */}
                        <button
                          type="button"
                          className="btn btn-whatsapp btn-sm"
                          onClick={() => abrirWhatsAppCliente(c.whatsapp, c.nome)}
                          title="Abrir WhatsApp com 1 clique (RF004)"
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => verHistorico(c.id)}
                          title="Ver histórico de compras e orçamentos"
                        >
                          Histórico
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Histórico do Cliente */}
      {clienteHistorico && (
        <div className="modal-overlay" onClick={() => setClienteHistorico(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                  Histórico: {clienteHistorico.nome}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  WhatsApp: {clienteHistorico.whatsapp} • {clienteHistorico.endereco}
                </div>
              </div>
              <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setClienteHistorico(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: '8px' }}>
                  Pedidos de Venda Realizados ({clienteHistorico.vendas?.length || 0})
                </h4>
                {(!clienteHistorico.vendas || clienteHistorico.vendas.length === 0) ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Nenhum pedido finalizado ainda.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {clienteHistorico.vendas.map(v => (
                      <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16, 22, 35, 0.6)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-card-border)' }}>
                        <div>
                          <strong>Pedido #{v.id}</strong> — {v.data_venda}
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Status: {v.status_producao}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: '#fff' }}>
                          {formatMoney(v.total_venda)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: '8px' }}>
                  Orçamentos Emitidos ({clienteHistorico.orcamentos?.length || 0})
                </h4>
                {(!clienteHistorico.orcamentos || clienteHistorico.orcamentos.length === 0) ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Nenhum orçamento registrado.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {clienteHistorico.orcamentos.map(o => (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16, 22, 35, 0.6)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-card-border)' }}>
                        <div>
                          <strong>Orçamento #{o.id}</strong> — {o.data_criacao}
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Status: {o.status}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                          {formatMoney(o.total_geral)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setClienteHistorico(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastro de Cliente (RF003) */}
      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Novo Cadastro de Cliente
              </h2>
              <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setModalAberto(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCadastrar}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Nome Completo / Haras / Fazenda *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: Haras Vale da Serra (Dr. Fernando)"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp (DDD + Número) *</label>
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
                  <label className="form-label">CPF ou CNPJ</label>
                  <input
                    type="text"
                    className="form-input"
                    value={novoDocumento}
                    onChange={(e) => setNovoDocumento(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Endereço de Entrega</label>
                  <input
                    type="text"
                    className="form-input"
                    value={novoEndereco}
                    onChange={(e) => setNovoEndereco(e.target.value)}
                    placeholder="Estrada / Rodovia, Bairro, Cidade - UF, CEP"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Instagram / Redes (@)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={novoInstagram}
                    onChange={(e) => setNovoInstagram(e.target.value)}
                    placeholder="@harasvaledaserra"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalAberto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
