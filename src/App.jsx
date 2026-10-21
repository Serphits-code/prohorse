import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FileText, ShoppingBag, Scissors, 
  Building2, Users, LogOut, Menu, X, Plus, AlertTriangle, Shield, User, Briefcase, Package, Layers
} from 'lucide-react';
import ProHorseLogo from './components/ProHorseLogo';
import LoginScreen from './components/LoginScreen';
import DashboardView from './components/DashboardView';
import OrcamentosView from './components/OrcamentosView';
import VendasView from './components/VendasView';
import BordadosView from './components/BordadosView';
import CatalogoView from './components/CatalogoView';
import FornecedoresView from './components/FornecedoresView';
import ClientesView from './components/ClientesView';
import NovoOrcamentoModal from './components/NovoOrcamentoModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('prohorse_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalNovoOrcamento, setModalNovoOrcamento] = useState(false);
  const [isVendaDiretaModal, setIsVendaDiretaModal] = useState(false);
  const [totalAtrasados, setTotalAtrasados] = useState(0);

  // Carrega alerta de bordados atrasados para exibir na badge do menu
  const checkAlertas = () => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => {
        if (d?.kpis?.bordados_atrasados !== undefined) {
          setTotalAtrasados(d.kpis.bordados_atrasados);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (currentUser) {
      checkAlertas();
      const interval = setInterval(checkAlertas, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('prohorse_user');
    localStorage.removeItem('prohorse_token');
    setCurrentUser(null);
  };

  // Se não estiver logado, exibe a tela de login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Gerencial', icon: LayoutDashboard },
    { id: 'orcamentos', label: 'Orçamentos & Balcão', icon: FileText },
    { id: 'vendas', label: 'Vendas & Produção', icon: ShoppingBag },
    { 
      id: 'bordados', 
      label: 'Esteira', 
      icon: Layers,
      badge: totalAtrasados > 0 ? `${totalAtrasados}` : null,
      badgeAlert: totalAtrasados > 0
    },
    { id: 'catalogo', label: 'Catálogo de Peças', icon: Package },
    { id: 'fornecedores', label: 'Oficinas Parceiras', icon: Building2 },
    { id: 'clientes', label: 'Clientes & Haras', icon: Users }
  ];

  const getPageTitle = () => {
    const found = navItems.find(item => item.id === activeTab);
    return found ? found.label : 'Selaria ProHorse';
  };

  const abrirNovoOrcamento = () => {
    setIsVendaDiretaModal(false);
    setModalNovoOrcamento(true);
  };

  const abrirNovaVenda = () => {
    setIsVendaDiretaModal(true);
    setModalNovoOrcamento(true);
  };

  return (
    <div className="app-layout">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar Desktop & Mobile Slide Drawer */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <ProHorseLogo height={44} textColor="#ffffff" />
          <button 
            type="button" 
            className="btn btn-secondary btn-icon btn-sm no-desktop"
            onClick={() => setMobileMenuOpen(false)}
            style={{ display: 'none' }}
          >
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div style={{
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-dim)',
            padding: '8px 16px 4px 16px',
            fontWeight: 700
          }}>
            Módulos do Sistema
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                <Icon size={18} className="nav-icon" />
                <span>{item.label}</span>

                {item.badge && (
                  <span className={`nav-badge ${item.badgeAlert ? 'badge-danger-animated' : 'badge-info'}`}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar: Perfil do Usuário Logado */}
        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="avatar-circle">
              {currentUser.avatar || currentUser.nome.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                {currentUser.nome}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)' }}>
                {currentUser.cargo}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-icon btn-sm"
            onClick={handleLogout}
            title="Sair do Sistema"
            style={{ color: 'var(--danger-text)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="app-main">
        {/* Topbar Superior */}
        <header className="app-topbar">
          <div className="topbar-title-section">
            <button
              type="button"
              className="btn btn-secondary btn-icon hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Abrir Menu de Navegação"
            >
              <Menu size={20} />
            </button>

            <h1 className="page-title">{getPageTitle()}</h1>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm topbar-btn-venda"
              onClick={abrirNovaVenda}
              title="Nova Venda Direta"
            >
              <ShoppingBag size={15} /> <span>Venda Direta</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm topbar-btn-orcamento"
              onClick={abrirNovoOrcamento}
              title="Novo Orçamento Comercial"
            >
              <Plus size={15} /> 
              <span className="topbar-btn-label-desktop">Novo Orçamento</span>
              <span className="topbar-btn-label-mobile">Orçamento</span>
            </button>
          </div>
        </header>

        {/* Container Central com a Tela Ativa */}
        <div className="content-container">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenNovoOrcamento={abrirNovoOrcamento}
              onOpenNovaVenda={abrirNovaVenda}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'orcamentos' && (
            <OrcamentosView
              onOpenNovoOrcamento={abrirNovoOrcamento}
            />
          )}

          {activeTab === 'vendas' && (
            <VendasView
              onOpenNovaVenda={abrirNovaVenda}
            />
          )}

          {activeTab === 'bordados' && (
            <BordadosView />
          )}

          {activeTab === 'catalogo' && (
            <CatalogoView />
          )}

          {activeTab === 'fornecedores' && (
            <FornecedoresView />
          )}

          {activeTab === 'clientes' && (
            <ClientesView
              onEmitirOrcamentoParaCliente={(cliente) => {
                abrirNovoOrcamento();
              }}
            />
          )}
        </div>
      </main>

      {/* Navegação Inferior para Celular / Smartphone (Alta Responsividade Mobile) */}
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Início</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'orcamentos' ? 'active' : ''}`}
          onClick={() => setActiveTab('orcamentos')}
        >
          <FileText size={20} />
          <span>Orçamentos</span>
        </button>

        <button
          type="button"
          className="mobile-nav-btn"
          onClick={abrirNovoOrcamento}
          style={{ color: 'var(--accent-gold)' }}
        >
          <div style={{
            background: 'var(--accent-gradient)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginTop: '-14px',
            boxShadow: '0 4px 12px var(--accent-glow)'
          }}>
            <Plus size={20} />
          </div>
          <span style={{ marginTop: '2px' }}>Criar</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'vendas' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendas')}
        >
          <ShoppingBag size={20} />
          <span>Vendas</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'bordados' ? 'active' : ''}`}
          onClick={() => setActiveTab('bordados')}
        >
          <Layers size={20} />
          <span>Esteira</span>
          {totalAtrasados > 0 && <span className="mobile-badge" />}
        </button>
      </nav>

      {/* Modal de Criação de Orçamento ou Venda Direta (RF001 - RF007, RF011) */}
      {modalNovoOrcamento && (
        <NovoOrcamentoModal
          isVendaDireta={isVendaDiretaModal}
          onClose={() => setModalNovoOrcamento(false)}
          onCreated={(res) => {
            checkAlertas();
            if (isVendaDiretaModal) {
              setActiveTab('vendas');
            } else {
              setActiveTab('orcamentos');
            }
          }}
        />
      )}
    </div>
  );
}
