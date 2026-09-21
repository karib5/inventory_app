import React from 'react';
import { api, Company, User } from '../api';

export default function SuperAdminHome({
  token,
  onOpenCompany,
}: {
  token: string;
  onOpenCompany: (id: number) => void;
}) {
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [name, setName] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState('');

  async function load() {
    const [companyList, userList] = await Promise.all([
      api('/admin/companies', {}, token),
      api('/admin/users', {}, token),
    ]);
    setCompanies(companyList);
    setUsers(userList);
  }

  React.useEffect(() => {
    load().catch(e => setError(e.message));
  }, []);

  async function createCompany(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api('/admin/companies', { method: 'POST', body: JSON.stringify({ name }) }, token);
      setName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create company');
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <section className="stats">
        <div className="card">
          <strong>{companies.length}</strong>
          <span>Companies</span>
        </div>
        <div className="card">
          <strong>{users.length}</strong>
          <span>Users</span>
        </div>
        <div className="card">
          <strong>{companies.filter(c => c.is_active).length}</strong>
          <span>Active Companies</span>
        </div>
      </section>

      <section className="card">
        <h2>Create Company</h2>
        <form onSubmit={createCompany} className="inline-form">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Company name"
            required
            minLength={2}
          />
          <button disabled={creating}>{creating ? 'Creating...' : 'Create Company'}</button>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="card">
        <h2>Companies</h2>
        {companies.length ? (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td>
                    <span className={c.is_active ? 'badge badge-active' : 'badge badge-inactive'}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(c.created_at).toLocaleString()}</td>
                  <td>
                    <button onClick={() => onOpenCompany(c.id)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No companies yet.</p>
        )}
      </section>

      <section className="card">
        <h2>Users</h2>
        {users.length ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.company_id ?? 'Global'}</td>
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
