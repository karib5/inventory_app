import React from 'react';
import { Building2 } from 'lucide-react';
import { api, setUnauthorizedHandler, User } from './api';
import AppShell from './layout/AppShell';
import Login from './pages/Login';
import SuperAdminHome from './pages/SuperAdminHome';
import CompanyDetail from './pages/CompanyDetail';
import Workspace from './pages/Workspace';

type SuperAdminView = { name: 'home' } | { name: 'company'; id: number };

function SuperAdminWorkspace({ token, user, onLogout }: { token: string; user: User; onLogout: () => void }) {
  const [view, setView] = React.useState<SuperAdminView>({ name: 'home' });

  return (
    <AppShell
      user={user}
      navItems={[{ key: 'companies', label: 'Companies', icon: <Building2 size={16} /> }]}
      activeKey="companies"
      onNavigate={() => setView({ name: 'home' })}
      onLogout={onLogout}
      onOpenSearch={() => {}}
    >
      {view.name === 'home' && <SuperAdminHome token={token} onOpenCompany={id => setView({ name: 'company', id })} />}
      {view.name === 'company' && (
        <>
          <button onClick={() => setView({ name: 'home' })} style={{ marginBottom: 16 }}>
            ← Back to Companies
          </button>
          <CompanyDetail token={token} companyId={view.id} />
        </>
      )}
    </AppShell>
  );
}

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

export default function App() {
  const [token, setToken] = React.useState(() => localStorage.getItem('inventory_token') || '');
  const [user, setUser] = React.useState<User | null>(null);
  const [sessionMessage, setSessionMessage] = React.useState('');

  // The one place session state gets torn down, whether that's the user
  // clicking Log out, a stale token found at startup, or the global 401
  // handler below reacting to an expired/invalid token from ANY API call
  // anywhere in the app.
  const clearSession = React.useCallback((message?: string) => {
    localStorage.removeItem('inventory_token');
    setToken('');
    setUser(null);
    setSessionMessage(message ?? '');
  }, []);

  React.useEffect(() => {
    setUnauthorizedHandler(() => clearSession(SESSION_EXPIRED_MESSAGE));
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  React.useEffect(() => {
    if (!token) return;
    api('/auth/me', {}, token)
      .then(setUser)
      .catch(() => clearSession(SESSION_EXPIRED_MESSAGE));
  }, [token, clearSession]);

  function logout() {
    clearSession();
  }

  function handleLoggedIn(newToken: string) {
    setSessionMessage('');
    setToken(newToken);
  }

  if (!token || !user) {
    return <Login onLoggedIn={handleLoggedIn} sessionMessage={sessionMessage} />;
  }

  if (user.role === 'super_admin') {
    return <SuperAdminWorkspace token={token} user={user} onLogout={logout} />;
  }

  return <Workspace token={token} user={user} onLogout={logout} />;
}
