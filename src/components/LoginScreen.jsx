import React, { useState } from 'react';
import { LogIn, User, Lock } from 'lucide-react';
import ProHorseLogo from './ProHorseLogo';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao autenticar.');
      }

      localStorage.setItem('prohorse_user', JSON.stringify(data.user));
      localStorage.setItem('prohorse_token', data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorativo */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: 'rgba(20, 27, 43, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px 32px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(245, 158, 11, 0.15)',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Header do Card com Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            color: '#ffffff'
          }}>
            <ProHorseLogo height={64} showText={false} />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            color: '#fff',
            marginBottom: '4px'
          }}>
            PROHORSE
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--accent-gold)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            fontWeight: 600
          }}>
            Gestão Comercial & Bordados
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger-text)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            fontSize: '0.875rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Formulário de Login Único para Produção */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} color="var(--accent-gold)" /> E-mail de Acesso
              </span>
            </label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail de acesso"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} color="var(--accent-gold)" /> Senha
              </span>
            </label>
            <input
              type="password"
              className="form-input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '13px', marginTop: '8px', fontSize: '1rem', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <LogIn size={18} /> Entrar no Sistema
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
