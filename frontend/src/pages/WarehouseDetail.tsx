import React from 'react';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import { api, Location, LocationType, resolveImageUrl, User, WarehouseDetail as WarehouseDetailType } from '../api';
import LocationTree from '../components/LocationTree';
import ImageUpload from '../components/ImageUpload';

const LOCATION_TYPES: LocationType[] = ['zone', 'aisle', 'rack', 'shelf', 'bin'];
const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  zone: 'Area',
  aisle: 'Area',
  rack: 'Rack',
  shelf: 'Shelf',
  bin: 'Bin',
};

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
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [error, setError] = React.useState('');

  const [editingWarehouse, setEditingWarehouse] = React.useState(false);
  const [whName, setWhName] = React.useState('');
  const [whAddress, setWhAddress] = React.useState('');
  const [savingWarehouse, setSavingWarehouse] = React.useState(false);
  const [togglingWarehouse, setTogglingWarehouse] = React.useState(false);

  const [locationForm, setLocationForm] = React.useState<{ mode: 'add' | 'edit'; parentId: number | null; editing?: Location } | null>(null);
  const [locCode, setLocCode] = React.useState('');
  const [locName, setLocName] = React.useState('');
  const [locType, setLocType] = React.useState<LocationType | ''>('');
  const [locParentId, setLocParentId] = React.useState('');
  const [savingLocation, setSavingLocation] = React.useState(false);

  const canManage = user.role === 'company_admin' || user.role === 'manager';

  async function load() {
    const [warehouseDetail, locationList] = await Promise.all([
      api(`/warehouses/${warehouseId}`, {}, token),
      api(`/locations?warehouse_id=${warehouseId}`, {}, token),
    ]);
    setWarehouse(warehouseDetail);
    setLocations(locationList);
  }

  React.useEffect(() => {
    load().catch(e => setError(e.message));
  }, [warehouseId]);

  function startEditWarehouse() {
    if (!warehouse) return;
    setWhName(warehouse.name);
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
        { method: 'PATCH', body: JSON.stringify({ name: whName, address: whAddress || null }) },
        token,
      );
      setEditingWarehouse(false);
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
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update warehouse');
    } finally {
      setTogglingWarehouse(false);
    }
  }

  function openAddLocation(parentId: number | null) {
    setLocationForm({ mode: 'add', parentId });
    setLocCode('');
    setLocName('');
    setLocType('');
    setLocParentId(parentId ? String(parentId) : '');
    setError('');
  }

  function openEditLocation(location: Location) {
    setLocationForm({ mode: 'edit', parentId: location.parent_id, editing: location });
    setLocCode(location.code);
    setLocName(location.name);
    setLocType(location.location_type ?? '');
    setLocParentId(location.parent_id ? String(location.parent_id) : '');
    setError('');
  }

  async function submitLocationForm(event: React.FormEvent) {
    event.preventDefault();
    if (!locationForm) return;
    setSavingLocation(true);
    setError('');
    try {
      if (locationForm.mode === 'add') {
        await api(
          '/locations',
          {
            method: 'POST',
            body: JSON.stringify({
              code: locCode,
              name: locName,
              warehouse_id: warehouseId,
              parent_id: locParentId ? Number(locParentId) : null,
              location_type: locType || null,
            }),
          },
          token,
        );
      } else if (locationForm.editing) {
        await api(
          `/locations/${locationForm.editing.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              name: locName,
              parent_id: locParentId ? Number(locParentId) : null,
              location_type: locType || null,
            }),
          },
          token,
        );
      }
      setLocationForm(null);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save location');
    } finally {
      setSavingLocation(false);
    }
  }

  async function toggleLocationActive(location: Location) {
    setError('');
    try {
      await api(
        `/locations/${location.id}`,
        { method: 'PATCH', body: JSON.stringify({ is_active: !location.is_active }) },
        token,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update location');
    }
  }

  if (!warehouse) {
    return (
      <section className="card">
        <button onClick={onBack}>← Back to Warehouses</button>
        <p>Loading warehouse...</p>
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
              {warehouse.code} — {warehouse.name}{' '}
              <span className={warehouse.is_active ? 'badge badge-active' : 'badge badge-inactive'}>
                {warehouse.is_active ? 'Active' : 'Inactive'}
              </span>
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>{warehouse.address ?? 'No address on file'}</p>
            <p style={{ color: 'var(--text-muted)', margin: '2px 0 0' }}>{warehouse.location_count} locations</p>
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
        <h2>Location Hierarchy</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: -8 }}>
          Area → Rack → Shelf/Bin. Use "+ Child" on a row to nest a location inside it.
        </p>
        {canManage && (
          <div className="inline-form" style={{ marginBottom: 16 }}>
            <button onClick={() => openAddLocation(null)}>Add Top-Level Location</button>
          </div>
        )}

        {locationForm && (
          <form onSubmit={submitLocationForm} className="inline-form" style={{ marginBottom: 16 }}>
            <input
              value={locCode}
              onChange={e => setLocCode(e.target.value)}
              placeholder="Code"
              required
              disabled={locationForm.mode === 'edit'}
            />
            <input value={locName} onChange={e => setLocName(e.target.value)} placeholder="Name" required />
            <select value={locType} onChange={e => setLocType(e.target.value as LocationType | '')}>
              <option value="">No type</option>
              {LOCATION_TYPES.map(t => (
                <option key={t} value={t}>
                  {LOCATION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select value={locParentId} onChange={e => setLocParentId(e.target.value)}>
              <option value="">No parent (top-level)</option>
              {locations
                .filter(l => !locationForm.editing || l.id !== locationForm.editing.id)
                .map(l => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
            </select>
            <button disabled={savingLocation}>{savingLocation ? 'Saving...' : locationForm.mode === 'add' ? 'Create' : 'Save'}</button>
            <button type="button" onClick={() => setLocationForm(null)}>
              Cancel
            </button>
          </form>
        )}

        <LocationTree
          locations={locations}
          canManage={canManage}
          onAddChild={parentId => openAddLocation(parentId)}
          onEdit={location => openEditLocation(location)}
          onToggleActive={toggleLocationActive}
        />
      </section>
    </>
  );
}
