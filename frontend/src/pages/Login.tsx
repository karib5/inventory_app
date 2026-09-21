import React from 'react';
import { api } from '../api';

export default function Login({ onLoggedIn }: { onLoggedIn: (token: string) => void }) {
  const [email, setEmail] = React.useState('admin@example.com');
  const [password, setPassword] = React.useState('ChangeMe123!');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
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
    <main className="login-page">
      <form className="card login-card" onSubmit={login}>
        <h1>Inventory</h1>
        <p>Storage Management System</p>
        <label>
          Email
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" />
        </label>
        <label>
          Password
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" />
        </label>
        {error && <div className="error">{error}</div>}
        <button disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        <small>Development login: admin@example.com / ChangeMe123!</small>
      </form>
    </main>
  );
}
