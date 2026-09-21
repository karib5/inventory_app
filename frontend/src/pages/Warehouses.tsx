import React from 'react';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import { api, resolveImageUrl, User, Warehouse } from '../api';
import ImageUpload from '../components/ImageUpload';

export default function Warehouses({
  token,
  user,
  warehouses,
  onChanged,
  onOpen,
}: {
  token: string;
  user: User;
  warehouses: Warehouse[];
  onChanged: () => void;
  onOpen: (warehouseId: number) => void;
}) {
  const [showAdd, setShowAdd] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState('');

  const canManage = user.role === 'company_admin' || user.role === 'manager';

  async function createWarehouse(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api(
        '/warehouses',
        { method: 'POST', body: JSON.stringify({ code, name, address: address || null, image_url: imageUrl }) },
        token,
      );
      setCode('');
      setName('');
      setAddress('');
      setImageUrl(null);
      setShowAdd(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create warehouse');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(warehouse: Warehouse) {
    setTogglingId(warehouse.id);
    setError('');
    try {
      await api(
        `/warehouses/${warehouse.id}`,
        { method: 'PATCH', body: JSON.stringify({ is_active: !warehouse.is_active }) },
        token,
      );
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update warehouse');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="card">
      <h2>Warehouses</h2>
      {canManage && (
        <div className="inline-form" style={{ marginBottom: 16 }}>
          <button onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : 'Add Warehouse'}</button>
        </div>
      )}
      {showAdd && canManage && (
        <form onSubmit={createWarehouse} style={{ marginBottom: 20 }}>
          <div className="field">
            <label>Warehouse Image</label>
            <ImageUpload token={token} value={imageUrl} onChange={setImageUrl} placeholderIcon={<WarehouseIcon size={26} />} />
          </div>
          <div className="inline-form">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code (e.g. WH1)" required />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Main Warehouse)" required />
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address (optional)" />
            <button className="primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      )}
      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}
      {warehouses.length ? (
        <div className="warehouse-grid">
          {warehouses.map(w => {
            const resolved = resolveImageUrl(w.image_url);
            return (
              <div className="warehouse-card" key={w.id}>
                {resolved ? (
                  <img src={resolved} alt={w.name} className="wh-image" />
                ) : (
                  <div className="wh-image-placeholder">
                    <WarehouseIcon size={34} />
                  </div>
                )}
                <div className="wh-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{w.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{w.code}</div>
                    </div>
                    <span className={w.is_active ? 'badge badge-active' : 'badge badge-inactive'}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {w.address && <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 0' }}>{w.address}</p>}
                  <div className="wh-stats">
                    <span>
                      <strong>{w.product_count}</strong> products
                    </span>
                    <span>
                      <strong>{w.total_units}</strong> units
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button className="primary" onClick={() => onOpen(w.id)}>
                      Open
                    </button>
                    {canManage && (
                      <button disabled={togglingId === w.id} onClick={() => toggleActive(w)}>
                        {togglingId === w.id ? 'Saving...' : w.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No warehouses yet.</p>
      )}
    </section>
  );
}
