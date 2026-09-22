import React from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { forgotPassword, resetPassword } from '../api';

/** The whole forgot/reset flow lives in this one component, entirely
 * driven by its own state and plain API calls - no routing, no query
 * params, no assumption that a browser (or any particular client) is
 * what's running it. A reset "code" the user reads off an email and
 * types back in works identically here, in a desktop shell wrapping
 * this same React app, or in a future native mobile client hitting the
 * same /api/auth endpoints - unlike a clickable emailed link, which
 * only makes sense for a website. */
export default function ForgotPasswordCard({
  initialEmail,
  onBackToLogin,
  onResetSuccess,
}: {
  initialEmail: string;
  onBackToLogin: () => void;
  onResetSuccess: (message: string) => void;
}) {
  const [step, setStep] = React.useState<'request' | 'reset'>('request');
  const [email, setEmail] = React.useState(initialEmail);
  const [code, setCode] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [info, setInfo] = React.useState('');

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await forgotPassword(email.trim());
      setInfo(result.message);
      setStep('reset');
    } catch (e) {
      // A network/server error, not "email not found" - the backend never
      // reports that distinction, on purpose.
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await forgotPassword(email.trim());
      setInfo(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (newPassword !== confirmPassword) {
      setError('Those passwords don’t match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await resetPassword(email.trim(), code.trim(), newPassword);
      onResetSuccess(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'request') {
    return (
      <form className="auth-card" onSubmit={requestCode} noValidate>
        <button type="button" className="ghost auth-back-link" onClick={onBackToLogin}>
          <ArrowLeft size={14} /> Back to sign in
        </button>
        <h2>Reset your password</h2>
        <p className="auth-subtitle">Enter your account email and we'll send you a reset code.</p>

        <div className="field">
          <label htmlFor="forgot-email">Email</label>
          <div className="input-icon-field">
            <Mail size={16} aria-hidden="true" />
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="username"
              autoFocus
              required
            />
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
              <Loader2 size={16} className="spin" /> Sending...
            </>
          ) : (
            'Send reset code'
          )}
        </button>
      </form>
    );
  }

  return (
    <form className="auth-card" onSubmit={submitReset} noValidate>
      <button
        type="button"
        className="ghost auth-back-link"
        onClick={() => {
          setStep('request');
          setError('');
        }}
      >
        <ArrowLeft size={14} /> Use a different email
      </button>
      <h2>Enter your reset code</h2>
      <p className="auth-subtitle">
        If an account exists for <strong>{email}</strong>, a code was just emailed to it. It expires in 15 minutes.
      </p>

      {info && (
        <div className="session-banner" role="status">
          <ShieldCheck size={15} /> {info}
        </div>
      )}

      <div className="field">
        <label htmlFor="reset-code">Reset code</label>
        <div className="input-icon-field">
          <KeyRound size={16} aria-hidden="true" />
          <input
            id="reset-code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. AB3DE9FG"
            maxLength={8}
            autoFocus
            required
            style={{ letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase' }}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="reset-new-password">New password</label>
        <div className="password-field input-icon-field">
          <Lock size={16} aria-hidden="true" />
          <input
            id="reset-new-password"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            autoComplete="new-password"
            minLength={8}
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
      </div>

      <div className="field">
        <label htmlFor="reset-confirm-password">Confirm new password</label>
        <div className="input-icon-field">
          <Lock size={16} aria-hidden="true" />
          <input
            id="reset-confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            minLength={8}
            required
          />
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
            <Loader2 size={16} className="spin" /> Resetting...
          </>
        ) : (
          'Reset password'
        )}
      </button>
      <button type="button" className="ghost auth-resend-link" onClick={resendCode} disabled={loading}>
        Didn't get a code? Send another
      </button>
    </form>
  );
}
