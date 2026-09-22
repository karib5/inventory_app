import React from 'react';
import { ArrowRight, Boxes, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import loginBackdropPhoto from '../assets/login-backdrop.jpg';
import loginPanelPhoto from '../assets/login-panel.jpg';
import ForgotPasswordCard from '../components/ForgotPasswordCard';
import ThemeToggle from '../components/ThemeToggle';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({
  onLoggedIn,
  sessionMessage,
}: {
  onLoggedIn: (token: string) => void;
  sessionMessage?: string;
}) {
  const [view, setView] = React.useState<'login' | 'forgot'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [emailError, setEmailError] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [postResetMessage, setPostResetMessage] = React.useState('');

  // Lets Escape back out of the forgot-password view, the same way the
  // "Back to sign in" link does - a keyboard user shouldn't need to tab
  // to it.
  React.useEffect(() => {
    if (view !== 'forgot') return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setView('login');
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    setEmailError('');
    setPasswordError('');
    setError('');

    const trimmedEmail = email.trim();
    let hasFieldError = false;
    if (!trimmedEmail) {
      setEmailError('Please enter your email address.');
      hasFieldError = true;
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      hasFieldError = true;
    }
    if (!password) {
      setPasswordError('Please enter your password.');
      hasFieldError = true;
    }
    if (hasFieldError) return;

    setLoading(true);
    try {
      const body = new URLSearchParams({ username: trimmedEmail, password });
      const result = await api('/auth/login', { method: 'POST', body });
      localStorage.setItem('inventory_token', result.access_token);
      onLoggedIn(result.access_token);
    } catch (e) {
      // The backend already avoids saying which field was wrong - keep that
      // guarantee here too, regardless of its exact wording.
      const message = e instanceof Error ? e.message : 'Login failed';
      setError(/incorrect|invalid/i.test(message) ? 'Invalid email or password.' : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-backdrop" aria-hidden="true" style={{ backgroundImage: `url(${loginBackdropPhoto})` }} />
      <div className="auth-backdrop-scrim" aria-hidden="true" />

      <div className="auth-shell">
        <ThemeToggle collapsed className="theme-toggle-login" />

        <section className="auth-form-panel">
          <div className="auth-logo">
            <span className="auth-logo-icon">
              <Boxes size={22} />
            </span>
            <div>
              <span className="auth-logo-word">Inventory</span>
              <span className="auth-logo-sub">Warehouse Management System</span>
            </div>
          </div>

          {view === 'forgot' ? (
            <ForgotPasswordCard
              initialEmail={email}
              onBackToLogin={() => setView('login')}
              onResetSuccess={message => {
                setPostResetMessage(message);
                setPassword('');
                setView('login');
              }}
            />
          ) : (
            <form className="auth-card" onSubmit={login} noValidate>
              <h2>Welcome back</h2>
              <p className="auth-subtitle">Sign in to your account</p>

              {(postResetMessage || sessionMessage) && (
                <div className="session-banner" role="status">
                  <ShieldCheck size={15} /> {postResetMessage || sessionMessage}
                </div>
              )}

              <div className="field">
                <label htmlFor="login-email">Email</label>
                <div className="input-icon-field">
                  <Mail size={16} aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    autoComplete="username"
                    autoFocus
                    aria-invalid={emailError ? true : undefined}
                    aria-describedby={emailError ? 'login-email-error' : undefined}
                    required
                  />
                </div>
                {emailError && (
                  <p className="field-error" id="login-email-error" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="login-password">Password</label>
                  <button
                    type="button"
                    className="ghost auth-forgot-link"
                    onClick={() => {
                      setError('');
                      setPostResetMessage('');
                      setView('forgot');
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="password-field input-icon-field">
                  <Lock size={16} aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    aria-invalid={passwordError ? true : undefined}
                    aria-describedby={passwordError ? 'login-password-error' : undefined}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordError && (
                  <p className="field-error" id="login-password-error" role="alert">
                    {passwordError}
                  </p>
                )}
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
                  <>
                    Sign In <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        <section className="auth-image-panel" aria-hidden="true">
          <img src={loginPanelPhoto} alt="" className="auth-brand-image" />
          <div className="auth-image-scrim" />
        </section>
      </div>

      <p className="auth-form-footer">
        <ShieldCheck size={13} /> Your data is encrypted and access-controlled.
      </p>
    </main>
  );
}
