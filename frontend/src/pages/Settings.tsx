import React from 'react';
import { Bell, Ruler, Tag, Truck, Users, Warehouse as WarehouseIcon } from 'lucide-react';
import { api, Location, Role, User, Warehouse } from '../api';
import Warehouses from './Warehouses';
import WarehouseDetail from './WarehouseDetail';

type SettingsView = 'home' | 'users' | 'warehouses';

function TeamSection({ token, user, onChanged }: { token: string; user: User; onChanged: () => void }) {
  const [users, setUsers] = React.useState<User[]>([]);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<Role>('staff');
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState('');

  const assignableRoles: Role[] = user.role === 'company_admin' ? ['manager', 'staff'] : ['staff'];

  async function load() {
    setUsers(await api('/admin/users', {}, token));
  }

  React.useEffect(() => {
    load().catch(e => setError(e.message));
  }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }, token);
      setName('');
      setEmail('');
      setPassword('');
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {(user.role === 'company_admin' || user.role === 'manager') && (
        <section className="card">
          <h2>Add Team Member</h2>
          <form onSubmit={createUser} className="inline-form">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Temporary password"
              type="password"
              required
              minLength={8}
            />
            <select value={role} onChange={e => setRole(e.target.value as Role)}>
              {assignableRoles.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button className="primary" disabled={creating}>
              {creating ? 'Creating...' : 'Add User'}
            </button>
          </form>
          {error && <div className="error">{error}</div>}
        </section>
      )}
      <section className="card">
        <h2>Team</h2>
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

export default function Settings({
  token,
  user,
  warehouses,
  locations,
  onChanged,
  initialWarehouseId,
}: {
  token: string;
  user: User;
  warehouses: Warehouse[];
  locations: Location[];
  onChanged: () => void;
  initialWarehouseId?: number | null;
}) {
  const [view, setView] = React.useState<SettingsView>('home');
  const [openWarehouseId, setOpenWarehouseId] = React.useState<number | null>(initialWarehouseId ?? null);

  React.useEffect(() => {
    if (initialWarehouseId) setOpenWarehouseId(initialWarehouseId);
  }, [initialWarehouseId]);

  if (openWarehouseId !== null) {
    return (
      <WarehouseDetail
        token={token}
        user={user}
        warehouseId={openWarehouseId}
        onBack={() => setOpenWarehouseId(null)}
        onChanged={onChanged}
      />
    );
  }

  if (view === 'users') {
    return (
      <>
        <button onClick={() => setView('home')} style={{ marginBottom: 16 }}>
          ← Back to Settings
        </button>
        <TeamSection token={token} user={user} onChanged={onChanged} />
      </>
    );
  }

  if (view === 'warehouses') {
    return (
      <>
        <button onClick={() => setView('home')} style={{ marginBottom: 16 }}>
          ← Back to Settings
        </button>
        <Warehouses
          token={token}
          user={user}
          warehouses={warehouses}
          onChanged={onChanged}
          onOpen={setOpenWarehouseId}
        />
        <p style={{ color: '#687386' }}>{locations.length} locations across all warehouses.</p>
      </>
    );
  }

  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Settings</h1>
      <p style={{ color: '#687386', marginTop: 0, marginBottom: 20 }}>
        Administrative configuration for your company.
      </p>
      <div className="tile-grid">
        <div className="tile" onClick={() => setView('users')}>
          <span className="tile-icon">
            <Users size={18} />
          </span>
          <span className="tile-title">Users & Permissions</span>
          <span className="tile-desc">Manage your team and their roles.</span>
        </div>
        <div className="tile" onClick={() => setView('warehouses')}>
          <span className="tile-icon">
            <WarehouseIcon size={18} />
          </span>
          <span className="tile-title">Warehouses & Locations</span>
          <span className="tile-desc">Warehouses, areas, racks, shelves and bins.</span>
        </div>
        <div className="tile disabled" title="Coming soon">
          <span className="tile-icon">
            <Tag size={18} />
          </span>
          <span className="tile-title">Categories & Brands</span>
          <span className="tile-desc">Organize your catalog. Coming soon.</span>
        </div>
        <div className="tile disabled" title="Coming soon">
          <span className="tile-icon">
            <Ruler size={18} />
          </span>
          <span className="tile-title">Units of Measurement</span>
          <span className="tile-desc">Piece, box, kg, litre... Coming soon.</span>
        </div>
        <div className="tile disabled" title="Coming soon">
          <span className="tile-icon">
            <Truck size={18} />
          </span>
          <span className="tile-title">Suppliers</span>
          <span className="tile-desc">Supplier contacts and pricing. Coming soon.</span>
        </div>
        <div className="tile disabled" title="Coming soon">
          <span className="tile-icon">
            <Bell size={18} />
          </span>
          <span className="tile-title">Notifications</span>
          <span className="tile-desc">Low-stock and expiry alerts. Coming soon.</span>
        </div>
      </div>
    </>
  );
}
