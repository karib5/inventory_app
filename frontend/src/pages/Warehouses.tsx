import React from 'react';
import { ArchiveRestore, ChevronDown, ChevronUp, Warehouse as WarehouseIcon } from 'lucide-react';
import { api, resolveImageUrl, unarchiveWarehouse, User, Warehouse } from '../api';
import ImageUpload from '../components/ImageUpload';
import WarehouseCard from '../components/WarehouseCard';
import { showToast } from '../components/Toast';

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

  const [archived, setArchived] = React.useState<Warehouse[]>([]);
  const [showArchived, setShowArchived] = React.useState(false);
  const [unarchivingId, setUnarchivingId] = React.useState<number | null>(null);

  const canManage = user.role === 'company_admin' || user.role === 'manager';
  const canUnarchive = user.role === 'super_admin' || user.role === 'company_admin';

  async function loadArchived() {
    setArchived(await api('/warehouses?archived=true', {}, token));
  }

  React.useEffect(() => {
    loadArchived().catch(() => setArchived([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUnarchive(warehouse: Warehouse) {
    setUnarchivingId(warehouse.id);
    try {
      await unarchiveWarehouse(warehouse.id, token);
      showToast(`"${warehouse.name}" restored to Warehouses & Locations.`);
      await loadArchived();
      onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to restore warehouse', 'error');
    } finally {
      setUnarchivingId(null);
    }
  }

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
      showToast(`Warehouse "${name}" created.`);
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
      showToast(`Warehouse "${warehouse.name}" ${warehouse.is_active ? 'deactivated' : 'activated'}.`);
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
          {warehouses.map(w => (
            <WarehouseCard
              key={w.id}
              warehouse={w}
              imageUrl={resolveImageUrl(w.image_url)}
              statusLabel={w.is_active ? 'Active' : 'Inactive'}
              statusClass={w.is_active ? 'badge-active' : 'badge-inactive'}
            >
              <button className="primary" onClick={() => onOpen(w.id)}>
                Open
              </button>
              {canManage && (
                <button disabled={togglingId === w.id} onClick={() => toggleActive(w)}>
                  {togglingId === w.id ? 'Saving...' : w.is_active ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </WarehouseCard>
          ))}
        </div>
      ) : (
        <p>No warehouses yet.</p>
      )}

      {archived.length > 0 && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button className="ghost" onClick={() => setShowArchived(s => !s)} style={{ padding: '4px 0' }}>
            {showArchived ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Archived Warehouses ({archived.length})
          </button>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            These have inventory history that can't be deleted, so they were archived instead and kept out of the
            list above. Restore one to make it manageable again.
          </p>
          {showArchived && (
            <div className="warehouse-grid" style={{ marginTop: 12 }}>
              {archived.map(w => (
                <WarehouseCard
                  key={w.id}
                  warehouse={w}
                  imageUrl={resolveImageUrl(w.image_url)}
                  statusLabel="Archived"
                  statusClass="badge-inactive"
                  archived
                >
                  {canUnarchive && (
                    <button disabled={unarchivingId === w.id} onClick={() => handleUnarchive(w)}>
                      <ArchiveRestore size={14} /> {unarchivingId === w.id ? 'Restoring...' : 'Unarchive'}
                    </button>
                  )}
                </WarehouseCard>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
