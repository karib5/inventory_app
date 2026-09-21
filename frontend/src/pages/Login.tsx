import React from 'react';
import { Boxes, Eye, EyeOff, Loader2, ShieldCheck, Truck } from 'lucide-react';
import { api } from '../api';
import ThemeToggle from '../components/ThemeToggle';
import WarehouseScene from '../components/WarehouseScene';

export default function Login({
  onLoggedIn,
  sessionMessage,
}: {
  onLoggedIn: (token: string) => void;
  sessionMessage?: string;
}) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const body = new URLSearchParams({ username: email, password });
      const result = await api('/auth/login', { method: 'POST', body });
      localStorage.setItem('inventory_token', result.access_token);
      onLoggedIn(result.access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand" aria-hidden="true">
        <WarehouseScene />
        <div className="auth-brand-grid" />
        <div className="auth-brand-scrim" />
        <div className="auth-brand-content">
          <div className="auth-logo">
            <Boxes size={22} /> Inventory
          </div>
          <h1>Manage your entire warehouse operation in one place.</h1>
          <p>Track products, warehouses, and stock movements in real time — built for teams that can't afford inventory surprises.</p>
        </div>
      </section>

      <section className="auth-form-side">
        <ThemeToggle collapsed className="theme-toggle-login" />

        <div className="auth-route-icon">
          <svg width="140" height="70" viewBox="0 0 140 70" aria-hidden="true">
            <path d="M4 60 Q 60 60 90 30 T 130 12" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 6" opacity="0.55" />
          </svg>
          <Truck size={24} className="auth-route-truck" strokeWidth={1.75} aria-hidden="true" />
        </div>

        <svg className="auth-corner-icon auth-corner-left" width="120" height="110" viewBox="0 0 120 110" aria-hidden="true">
          <rect x="14" y="46" width="40" height="40" rx="2" fill="var(--accent)" />
          <rect x="50" y="30" width="44" height="56" rx="2" fill="var(--accent)" opacity="0.75" />
          <rect x="60" y="42" width="24" height="4" fill="var(--card)" opacity="0.6" />
          <rect x="60" y="52" width="24" height="4" fill="var(--card)" opacity="0.6" />
          <rect x="24" y="58" width="20" height="4" fill="var(--card)" opacity="0.6" />
        </svg>

        <svg className="auth-corner-icon auth-corner-right" width="140" height="110" viewBox="0 0 140 110" aria-hidden="true">
          <path d="M0 110 V54 L28 34 L56 54 V110 Z" fill="var(--accent)" opacity="0.8" />
          <rect x="8" y="62" width="14" height="14" fill="var(--card)" opacity="0.55" />
          <rect x="34" y="62" width="14" height="14" fill="var(--card)" opacity="0.55" />
          <rect x="8" y="84" width="14" height="14" fill="var(--card)" opacity="0.55" />
          <rect x="34" y="84" width="14" height="14" fill="var(--card)" opacity="0.55" />
          <path d="M60 110 V70 H126 V110 Z" fill="var(--accent)" opacity="0.55" />
          <rect x="70" y="80" width="16" height="16" fill="var(--card)" opacity="0.5" />
          <rect x="100" y="80" width="16" height="16" fill="var(--card)" opacity="0.5" />
        </svg>

        <form className="auth-card" onSubmit={login} noValidate>
          <div className="auth-card-logo">
            <Boxes size={24} />
          </div>
          <h2>Welcome back</h2>
          <p className="auth-subtitle">Sign in to your account</p>

          {sessionMessage && (
            <div className="session-banner" role="status">
              <ShieldCheck size={15} /> {sessionMessage}
            </div>
          )}

          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                tabIndex={0}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          <button className="primary auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="spin" /> Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        <p className="auth-form-footer">
          <ShieldCheck size={13} /> Your data is encrypted and access-controlled.
        </p>
      </section>
    </main>
  );
}
