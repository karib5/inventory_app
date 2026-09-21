import React from 'react';
import { Boxes, Layers, Package, Trash2, Warehouse as WarehouseIcon } from 'lucide-react';
import { api, confirmDeleteWarehouse, resolveImageUrl, User, WarehouseDetail as WarehouseDetailType } from '../api';
import WarehouseLayout from '../components/WarehouseLayout';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import ImageUpload from '../components/ImageUpload';
import { showToast } from '../components/Toast';

export default function WarehouseDetail({
  token,
  user,
  warehouseId,
  onBack,
  onChanged,
}: {
  token: string;
  user: User;
  warehouseId: number;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [warehouse, setWarehouse] = React.useState<WarehouseDetailType | null>(null);
  const [error, setError] = React.useState('');

  const [editingWarehouse, setEditingWarehouse] = React.useState(false);
  const [whName, setWhName] = React.useState('');
  const [whDescription, setWhDescription] = React.useState('');
  const [whAddress, setWhAddress] = React.useState('');
  const [savingWarehouse, setSavingWarehouse] = React.useState(false);
  const [togglingWarehouse, setTogglingWarehouse] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const canManage = user.role === 'company_admin' || user.role === 'manager';
  const canDelete = user.role === 'super_admin' || user.role === 'company_admin';

  async function load() {
    const detail = await api(`/warehouses/${warehouseId}`, {}, token);
    setWarehouse(detail);
  }

  React.useEffect(() => {
    load().catch(e => setError(e.message));
  }, [warehouseId]);

  function startEditWarehouse() {
    if (!warehouse) return;
    setWhName(warehouse.name);
    setWhDescription(warehouse.description ?? '');
    setWhAddress(warehouse.address ?? '');
    setEditingWarehouse(true);
  }

  async function saveWarehouse(event: React.FormEvent) {
    event.preventDefault();
    setSavingWarehouse(true);
    setError('');
    try {
      await api(
        `/warehouses/${warehouseId}`,
        { method: 'PATCH', body: JSON.stringify({ name: whName, description: whDescription || null, address: whAddress || null }) },
        token,
      );
      setEditingWarehouse(false);
      showToast('Warehouse updated.');
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update warehouse');
    } finally {
      setSavingWarehouse(false);
    }
  }

  async function saveWarehouseImage(url: string | null) {
    await api(`/warehouses/${warehouseId}`, { method: 'PATCH', body: JSON.stringify({ image_url: url }) }, token);
    await load();
    onChanged();
  }

  async function toggleWarehouseActive() {
    if (!warehouse) return;
    setTogglingWarehouse(true);
    setError('');
    try {
      await api(
        `/warehouses/${warehouseId}`,
        { method: 'PATCH', body: JSON.stringify({ is_active: !warehouse.is_active }) },
        token,
      );
      showToast(`Warehouse ${warehouse.is_active ? 'deactivated' : 'activated'}.`);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update warehouse');
    } finally {
      setTogglingWarehouse(false);
    }
  }

  async function handleDeleteConfirm(password: string) {
    const result = await confirmDeleteWarehouse(warehouseId, password, token);
    showToast(result.message);
    setConfirmingDelete(false);
    onChanged();
    onBack();
  }

  if (!warehouse) {
    return (
      <section className="card">
        <button onClick={onBack}>← Back to Warehouses</button>
        {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : <p>Loading warehouse...</p>}
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <button onClick={onBack} style={{ marginBottom: 16 }}>
          ← Back to Warehouses
        </button>
        <div className="thumb-row" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
          {resolveImageUrl(warehouse.image_url) ? (
            <img src={resolveImageUrl(warehouse.image_url)!} alt={warehouse.name} className="thumb-lg" />
          ) : (
            <div className="thumb-lg thumb-placeholder">
              <WarehouseIcon size={30} />
            </div>
          )}
          <div>
            <h2 style={{ margin: 0 }}>
              {warehouse.name}{' '}
              <span className={warehouse.is_active ? 'badge badge-active' : 'badge badge-inactive'}>
                {warehouse.is_active ? 'Active' : 'Inactive'}
              </span>
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>{warehouse.code}</p>
            {warehouse.description && <p style={{ margin: '4px 0 0' }}>{warehouse.description}</p>}
            <p style={{ color: 'var(--text-muted)', margin: '2px 0 0' }}>{warehouse.address ?? 'No address on file'}</p>
          </div>
        </div>

        {canManage && !editingWarehouse && (
          <div className="inline-form">
            <button onClick={startEditWarehouse}>Edit Warehouse</button>
            <button disabled={togglingWarehouse} onClick={toggleWarehouseActive}>
              {togglingWarehouse ? 'Saving...' : warehouse.is_active ? 'Deactivate Warehouse' : 'Activate Warehouse'}
            </button>
          </div>
        )}

        {editingWarehouse && (
          <form onSubmit={saveWarehouse} style={{ marginTop: 12 }}>
            <div className="field">
              <label>Warehouse Image</label>
              <ImageUpload token={token} value={warehouse.image_url} onChange={saveWarehouseImage} placeholderIcon={<WarehouseIcon size={26} />} />
            </div>
            <div className="inline-form">
              <input value={whName} onChange={e => setWhName(e.target.value)} placeholder="Name" required />
              <input value={whDescription} onChange={e => setWhDescription(e.target.value)} placeholder="Description" />
              <input value={whAddress} onChange={e => setWhAddress(e.target.value)} placeholder="Address" />
              <button className="primary" disabled={savingWarehouse}>
                {savingWarehouse ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditingWarehouse(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {error && (
        <section className="card">
          <div className="error">{error}</div>
        </section>
      )}

      <section className="card">
        <h2 style={{ marginBottom: 4 }}>Warehouse Overview</h2>
        <div className="stats" style={{ marginTop: 16 }}>
          <div className="card">
            <span className="stat-icon">
              <Boxes size={18} />
            </span>
            <div>
              <strong>{warehouse.area_count}</strong>
              <span>Areas</span>
            </div>
          </div>
          <div className="card">
            <span className="stat-icon">
              <Layers size={18} />
            </span>
            <div>
              <strong>{warehouse.rack_count}</strong>
              <span>Racks</span>
            </div>
          </div>
          <div className="card">
            <span className="stat-icon">
              <Layers size={18} />
            </span>
            <div>
              <strong>{warehouse.shelf_count}</strong>
              <span>Shelves</span>
            </div>
          </div>
          <div className="card">
            <span className="stat-icon">
              <Package size={18} />
            </span>
            <div>
              <strong>{warehouse.product_count}</strong>
              <span>Products</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginBottom: 4 }}>Warehouse Layout</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 16 }}>
          Click an area to see its racks and shelves. {canManage && 'Drag a rack to reposition it, or drag "New Rack" into an empty spot.'}
        </p>
        <WarehouseLayout token={token} warehouseId={warehouseId} canManage={canManage} onChanged={onChanged} />
      </section>

      {canDelete && (
        <section className="card">
          <div className="danger-zone" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <h4>Danger Zone</h4>
            <button className="danger" onClick={() => setConfirmingDelete(true)}>
              <Trash2 size={14} /> Delete Warehouse
            </button>
          </div>
        </section>
      )}

      {confirmingDelete && (
        <PasswordConfirmModal
          title="Delete Warehouse?"
          targetName={warehouse.name}
          explanation="This action will remove the warehouse from your company. If it still has inventory history, it will be deactivated instead so that history is never lost."
          confirmLabel="Delete Warehouse"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}
