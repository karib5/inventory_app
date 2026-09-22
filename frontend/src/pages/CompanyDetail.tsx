import React from 'react';
import { api, CompanyDetail as CompanyDetailType, User } from '../api';

export default function CompanyDetail({
  token,
  companyId,
}: {
  token: string;
  companyId: number;
}) {
  const [company, setCompany] = React.useState<CompanyDetailType | null>(null);
  const [users, setUsers] = React.useState<User[]>([]);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);
  const [error, setError] = React.useState('');

  async function load() {
    const [companyDetail, allUsers] = await Promise.all([
      api(`/admin/companies/${companyId}`, {}, token),
      api('/admin/users', {}, token),
    ]);
    setCompany(companyDetail);
    setUsers(allUsers.filter((u: User) => u.company_id === companyId));
  }

  React.useEffect(() => {
    load().catch(e => setError(e.message));
  }, [companyId]);

  async function createCompanyAdmin(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api(
        '/admin/users',
        {
          method: 'POST',
          body: JSON.stringify({ name, email, password, role: 'company_admin', company_id: companyId }),
        },
        token,
      );
      setName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create company admin');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive() {
    if (!company) return;
    setToggling(true);
    setError('');
    try {
      await api(
        `/admin/companies/${companyId}`,
        { method: 'PATCH', body: JSON.stringify({ is_active: !company.is_active }) },
        token,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update company status');
    } finally {
      setToggling(false);
    }
  }

  if (!company) return <section className="card">Loading company...</section>;

  const hasCompanyAdmin = users.some(u => u.role === 'company_admin');

  return (
    <>
      <section className="card">
        <h2>
          {company.name}{' '}
          <span className={company.is_active ? 'badge badge-active' : 'badge badge-inactive'}>
            {company.is_active ? 'Active' : 'Inactive'}
          </span>
        </h2>
        <p>Created {new Date(company.created_at).toLocaleString()}</p>
        <button onClick={toggleActive} disabled={toggling}>
          {toggling ? 'Updating...' : company.is_active ? 'Deactivate Company' : 'Activate Company'}
        </button>
      </section>

      <section className="stats">
        <div className="card">
          <strong>{company.user_count}</strong>
          <span>Users</span>
        </div>
        <div className="card">
          <strong>{company.location_count}</strong>
          <span>Locations</span>
        </div>
        <div className="card">
          <strong>{company.product_count}</strong>
          <span>Products</span>
        </div>
      </section>

      <section className="card">
        <h2>Create Company Admin</h2>
        {hasCompanyAdmin && (
          <p style={{ color: 'var(--text-muted)' }}>
            This company already has a company admin. You can still add another if needed.
          </p>
        )}
        <form onSubmit={createCompanyAdmin} className="inline-form">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required />
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Temporary password"
            type="password"
            required
            minLength={8}
          />
          <button disabled={creating}>{creating ? 'Creating...' : 'Create Company Admin'}</button>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="card">
        <h2>Company Users</h2>
        {users.length ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No users yet.</p>
        )}
      </section>
    </>
  );
}
