import React from 'react';
import { ArrowDown, ArrowUp, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, Location, LocationStock } from '../api';
import Drawer from './Drawer';
import RemoveLocationConfirm from './RemoveLocationConfirm';
import { showToast } from './Toast';

function slugCode(prefix: string, name: string): string {
  const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 20);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${slug || 'ITEM'}-${suffix}`;
}

function ShelfRow({
  shelf,
  stock,
  canManage,
  isFirst,
  isLast,
  onMove,
  onSaved,
  onRemoved,
  token,
}: {
  shelf: Location;
  stock?: LocationStock;
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: 'up' | 'down') => void;
  onSaved: () => void;
  onRemoved: () => void;
  token: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(shelf.name);
  const [description, setDescription] = React.useState(shelf.description ?? '');
  const [capacity, setCapacity] = React.useState(shelf.capacity != null ? String(shelf.capacity) : '');
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [confirmingRemove, setConfirmingRemove] = React.useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(
        `/locations/${shelf.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name, description: description || null, capacity: capacity ? Number(capacity) : null }),
        },
        token,
      );
      showToast('Shelf updated.');
      setEditing(false);
      onSaved();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update shelf', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(force: boolean) {
    setRemoving(true);
    try {
      await api(`/locations/${shelf.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: false, force }) }, token);
      showToast(force ? 'Shelf removed and its stock cleared.' : 'Shelf removed.');
      setConfirmingRemove(false);
      onRemoved();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove shelf', 'error');
      setRemoving(false);
    }
  }

  function handleRemoveClick() {
    if ((stock?.product_count ?? 0) > 0) {
      setConfirmingRemove(true);
    } else {
      remove(false);
    }
  }

  if (editing) {
    return (
      <form className="shelf-row shelf-row-editing" onSubmit={save}>
        <div className="field">
          <label>Shelf name</label>
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
        </div>
        <div className="field">
          <label>Capacity</label>
          <input type="number" min={0} value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Optional" />
        </div>
        <div className="modal-actions">
          <button className="primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="shelf-row">
      <div className="shelf-row-main">
        <div>
          <strong>{shelf.name}</strong>
          <span className="shelf-row-code">{shelf.code}</span>
        </div>
        <div className="shelf-row-stats">
          <span>{stock?.product_count ?? 0} products</span>
          <span>{stock?.total_units ?? 0} units</span>
          {shelf.capacity != null && <span>cap. {shelf.capacity}</span>}
        </div>
      </div>
      {canManage && (
        <div className="shelf-row-actions">
          <button className="icon-btn ghost" onClick={() => onMove('up')} disabled={isFirst} aria-label="Move shelf up">
            <ArrowUp size={14} />
          </button>
          <button className="icon-btn ghost" onClick={() => onMove('down')} disabled={isLast} aria-label="Move shelf down">
            <ArrowDown size={14} />
          </button>
          <button className="icon-btn ghost" onClick={() => setEditing(true)} aria-label="Edit shelf">
            <Pencil size={14} />
          </button>
          <button className="icon-btn ghost" onClick={handleRemoveClick} disabled={removing} aria-label="Remove shelf">
            <Trash2 size={14} />
          </button>
        </div>
      )}
      {confirmingRemove && (
        <RemoveLocationConfirm
          title="Remove Shelf?"
          targetName={shelf.name}
          productCount={stock?.product_count ?? 0}
          totalUnits={stock?.total_units ?? 0}
          confirmLabel="Remove Anyway"
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={() => remove(true)}
        />
      )}
    </div>
  );
}

export default function RackPanel({
  token,
  rack,
  shelves,
  stockByLocation,
  canManage,
  onClose,
  onChanged,
}: {
  token: string;
  rack: Location;
  shelves: Location[];
  stockByLocation: Map<number, LocationStock>;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = React.useState(rack.name);
  const [description, setDescription] = React.useState(rack.description ?? '');
  const [saving, setSaving] = React.useState(false);
  const [addingShelf, setAddingShelf] = React.useState(false);
  const [removingRack, setRemovingRack] = React.useState(false);
  const [confirmingRemoveRack, setConfirmingRemoveRack] = React.useState(false);

  React.useEffect(() => {
    setName(rack.name);
    setDescription(rack.description ?? '');
  }, [rack.id, rack.name, rack.description]);

  // Includes the rack's own direct stock (a rack can hold stock without a
  // shelf under it) as well as everything on its shelves - removing the
  // rack would clear all of it, so both need to count toward the warning.
  const rackDirectStock = stockByLocation.get(rack.id);
  const rackStock = shelves.reduce(
    (sum, s) => {
      const stock = stockByLocation.get(s.id);
      return { products: sum.products + (stock?.product_count ?? 0), units: sum.units + (stock?.total_units ?? 0) };
    },
    { products: rackDirectStock?.product_count ?? 0, units: rackDirectStock?.total_units ?? 0 },
  );

  async function saveRack(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(
        `/locations/${rack.id}`,
        { method: 'PATCH', body: JSON.stringify({ name, description: description || null }) },
        token,
      );
      showToast('Rack updated.');
      onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update rack', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addShelf() {
    setAddingShelf(true);
    try {
      const nextIndex = shelves.length + 1;
      await api(
        '/locations',
        {
          method: 'POST',
          body: JSON.stringify({
            code: slugCode(rack.code, `S${nextIndex}`),
            name: `Shelf ${nextIndex}`,
            warehouse_id: rack.warehouse_id,
            parent_id: rack.id,
            location_type: 'shelf',
            position_x: shelves.length,
          }),
        },
        token,
      );
      showToast('Shelf added.');
      onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add shelf', 'error');
    } finally {
      setAddingShelf(false);
    }
  }

  async function moveShelf(shelf: Location, direction: 'up' | 'down') {
    const index = shelves.findIndex(s => s.id === shelf.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= shelves.length) return;
    const other = shelves[swapIndex];
    const a = shelf.position_x ?? index;
    const b = other.position_x ?? swapIndex;
    try {
      await Promise.all([
        api(`/locations/${shelf.id}`, { method: 'PATCH', body: JSON.stringify({ position_x: b }) }, token),
        api(`/locations/${other.id}`, { method: 'PATCH', body: JSON.stringify({ position_x: a }) }, token),
      ]);
      onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to reorder shelves', 'error');
    }
  }

  async function removeRack(force: boolean) {
    setRemovingRack(true);
    try {
      await api(`/locations/${rack.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: false, force }) }, token);
      showToast(force ? 'Rack removed and its stock cleared.' : 'Rack removed.');
      onChanged();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove rack', 'error');
      setRemovingRack(false);
    }
  }

  function handleRemoveRackClick() {
    if (rackStock.products > 0) {
      setConfirmingRemoveRack(true);
    } else {
      removeRack(false);
    }
  }

  return (
    <Drawer onClose={onClose}>
      <div className="rack-panel-header">
        <span className="rack-panel-icon">
          <Layers size={20} />
        </span>
        <div>
          <h2 style={{ margin: 0 }}>{rack.name}</h2>
          <p style={{ color: 'var(--text-muted)', margin: '2px 0 0' }}>{rack.code}</p>
        </div>
      </div>

      {canManage ? (
        <form onSubmit={saveRack} style={{ marginTop: 16 }}>
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <button className="primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      ) : (
        description && <p style={{ color: 'var(--text-muted)' }}>{description}</p>
      )}

      <div className="stats" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 20, marginBottom: 0 }}>
        <div className="card">
          <div>
            <strong>{shelves.length}</strong>
            <span>Shelves</span>
          </div>
        </div>
        <div className="card">
          <div>
            <strong>{rackStock.products}</strong>
            <span>Products</span>
          </div>
        </div>
        <div className="card">
          <div>
            <strong>{rackStock.units}</strong>
            <span>Units</span>
          </div>
        </div>
      </div>

      <div className="drawer-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Shelves</h4>
          {canManage && (
            <button className="ghost" onClick={addShelf} disabled={addingShelf} style={{ padding: '4px 8px', fontSize: 12 }}>
              <Plus size={13} /> {addingShelf ? 'Adding...' : 'Add Shelf'}
            </button>
          )}
        </div>
        {shelves.length ? (
          <div style={{ marginTop: 8 }}>
            {shelves.map((shelf, index) => (
              <ShelfRow
                key={shelf.id}
                shelf={shelf}
                stock={stockByLocation.get(shelf.id)}
                canManage={canManage}
                isFirst={index === 0}
                isLast={index === shelves.length - 1}
                onMove={direction => moveShelf(shelf, direction)}
                onSaved={onChanged}
                onRemoved={onChanged}
                token={token}
              />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>No shelves yet.</p>
        )}
      </div>

      {canManage && (
        <div className="drawer-section danger-zone">
          <h4>Danger Zone</h4>
          <button className="danger" onClick={handleRemoveRackClick} disabled={removingRack}>
            <Trash2 size={14} /> {removingRack ? 'Removing...' : 'Remove Rack'}
          </button>
        </div>
      )}

      {confirmingRemoveRack && (
        <RemoveLocationConfirm
          title="Remove Rack?"
          targetName={rack.name}
          productCount={rackStock.products}
          totalUnits={rackStock.units}
          confirmLabel="Remove Anyway"
          onCancel={() => setConfirmingRemoveRack(false)}
          onConfirm={() => removeRack(true)}
        />
      )}
    </Drawer>
  );
}
