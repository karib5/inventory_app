import React from 'react';
import { Building2 } from 'lucide-react';
import { api, User } from './api';
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

export default function App() {
  const [token, setToken] = React.useState(() => localStorage.getItem('inventory_token') || '');
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    if (!token) return;
    api('/auth/me', {}, token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('inventory_token');
        setToken('');
      });
  }, [token]);

  function logout() {
    localStorage.removeItem('inventory_token');
    setToken('');
    setUser(null);
  }

  if (!token || !user) {
    return <Login onLoggedIn={setToken} />;
  }

  if (user.role === 'super_admin') {
    return <SuperAdminWorkspace token={token} user={user} onLogout={logout} />;
  }

  return <Workspace token={token} user={user} onLogout={logout} />;
}
