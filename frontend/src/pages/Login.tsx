import React from 'react';
import { Boxes, Eye, EyeOff, Loader2, ShieldCheck, TrendingUp, Warehouse, Zap } from 'lucide-react';
import { api } from '../api';
import ThemeToggle from '../components/ThemeToggle';

const FEATURES = [
  { icon: Zap, label: 'Real-time inventory' },
  { icon: Warehouse, label: 'Warehouse management' },
  { icon: TrendingUp, label: 'Stock tracking' },
];

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
        <div className="auth-brand-grid" />
        <div className="auth-brand-content">
          <div className="auth-logo">
            <Boxes size={22} /> Inventory
          </div>
          <h1>Manage your entire warehouse operation in one place.</h1>
          <p>Track products, warehouses, and stock movements in real time — built for teams that can't afford inventory surprises.</p>
          <ul className="auth-features">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label}>
                <span className="auth-feature-icon">
                  <Icon size={16} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="auth-form-side">
        <ThemeToggle collapsed className="theme-toggle-login" />
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
      </section>
    </main>
  );
}
