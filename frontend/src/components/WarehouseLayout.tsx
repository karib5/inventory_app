import React from 'react';
import { ArrowLeft, Layers, Plus, Trash2 } from 'lucide-react';
import { api, Location, LocationStock } from '../api';
import { SkeletonRows } from './Skeleton';
import AreaIcon from './AreaIcon';
import RackPanel from './RackPanel';
import RemoveLocationConfirm from './RemoveLocationConfirm';
import { showToast } from './Toast';

const GRID_COLS = 4;

function slugCode(prefix: string, name: string): string {
  const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 20);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${slug || 'ITEM'}-${suffix}`;
}

type RackWithPosition = Location & { gx: number; gy: number };

function withGridPositions(racks: Location[]): RackWithPosition[] {
  const used = new Set(
    racks.filter(r => r.position_x != null && r.position_y != null).map(r => `${r.position_x},${r.position_y}`),
  );
  let cursor = 0;
  function nextFreeCell() {
    while (used.has(`${cursor % GRID_COLS},${Math.floor(cursor / GRID_COLS)}`)) cursor++;
    const cell = { x: cursor % GRID_COLS, y: Math.floor(cursor / GRID_COLS) };
    used.add(`${cell.x},${cell.y}`);
    cursor++;
    return cell;
  }
  return racks.map(r => {
    if (r.position_x != null && r.position_y != null) return { ...r, gx: r.position_x, gy: r.position_y };
    const cell = nextFreeCell();
    return { ...r, gx: cell.x, gy: cell.y };
  });
}

export default function WarehouseLayout({
  token,
  warehouseId,
  canManage,
  onChanged,
}: {
  token: string;
  warehouseId: number;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [stockByLocation, setStockByLocation] = React.useState<Map<number, LocationStock>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [areaId, setAreaId] = React.useState<number | null>(null);
  const [selectedRackId, setSelectedRackId] = React.useState<number | null>(null);

  const [addingArea, setAddingArea] = React.useState(false);
  const [areaName, setAreaName] = React.useState('');
  const [areaDescription, setAreaDescription] = React.useState('');
  const [areaCapacity, setAreaCapacity] = React.useState('4');
  const [savingArea, setSavingArea] = React.useState(false);

  const [dragOverCell, setDragOverCell] = React.useState<string | null>(null);

  const [removingArea, setRemovingArea] = React.useState(false);
  const [confirmingRemoveArea, setConfirmingRemoveArea] = React.useState(false);

  async function load() {
    const [locs, stock] = await Promise.all([
      api(`/locations?warehouse_id=${warehouseId}`, {}, token),
      api(`/warehouses/${warehouseId}/location-stock`, {}, token),
    ]);
    setLocations(locs);
    setStockByLocation(new Map(stock.map((s: LocationStock) => [s.location_id, s])));
  }

  React.useEffect(() => {
    setLoading(true);
    load()
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [warehouseId]);

  async function refresh() {
    await load();
    onChanged();
  }

  const areas = locations.filter(l => l.parent_id === null && (l.location_type === 'zone' || l.location_type === 'aisle'));
  const currentArea = areaId != null ? locations.find(l => l.id === areaId) ?? null : null;

  function racksOf(parentId: number) {
    return locations.filter(l => l.parent_id === parentId && l.location_type === 'rack');
  }
  function shelvesOf(parentId: number) {
    return locations
      .filter(l => l.parent_id === parentId && l.location_type === 'shelf')
      .sort((a, b) => (a.position_x ?? 0) - (b.position_x ?? 0));
  }
  function areaStats(area: Location) {
    const racks = racksOf(area.id);
    let products = 0;
    let units = 0;
    for (const rack of racks) {
      for (const shelf of shelvesOf(rack.id)) {
        const stock = stockByLocation.get(shelf.id);
        products += stock?.product_count ?? 0;
        units += stock?.total_units ?? 0;
      }
      const rackStock = stockByLocation.get(rack.id);
      products += rackStock?.product_count ?? 0;
      units += rackStock?.total_units ?? 0;
    }
    return { racks: racks.length, products, units };
  }

  async function addArea(event: React.FormEvent) {
    event.preventDefault();
    setSavingArea(true);
    try {
      await api(
        '/locations',
        {
          method: 'POST',
          body: JSON.stringify({
            code: slugCode('AREA', areaName),
            name: areaName,
            description: areaDescription || null,
            warehouse_id: warehouseId,
            location_type: 'zone',
            capacity: areaCapacity ? Number(areaCapacity) : null,
          }),
        },
        token,
      );
      showToast(`"${areaName}" area created.`);
      setAddingArea(false);
      setAreaName('');
      setAreaDescription('');
      setAreaCapacity('4');
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create area', 'error');
    } finally {
      setSavingArea(false);
    }
  }

  async function createRack(x: number, y: number) {
    if (!currentArea) return;
    const rackCount = racksOf(currentArea.id).length;
    try {
      await api(
        '/locations',
        {
          method: 'POST',
          body: JSON.stringify({
            code: slugCode('RACK', `${currentArea.name}-${rackCount + 1}`),
            name: `Rack ${rackCount + 1}`,
            warehouse_id: warehouseId,
            parent_id: currentArea.id,
            location_type: 'rack',
            position_x: x,
            position_y: y,
          }),
        },
        token,
      );
      showToast('Rack added.');
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add rack', 'error');
    }
  }

  async function moveRack(rackId: number, x: number, y: number) {
    try {
      await api(`/locations/${rackId}`, { method: 'PATCH', body: JSON.stringify({ position_x: x, position_y: y }) }, token);
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to move rack', 'error');
    }
  }

  async function removeArea(force: boolean) {
    if (!currentArea) return;
    setRemovingArea(true);
    try {
      await api(
        `/locations/${currentArea.id}`,
        { method: 'PATCH', body: JSON.stringify({ is_active: false, force }) },
        token,
      );
      showToast(force ? 'Area removed and its stock cleared.' : 'Area removed.');
      setConfirmingRemoveArea(false);
      setAreaId(null);
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove area', 'error');
      setRemovingArea(false);
    }
  }

  function handleRemoveAreaClick(stats: { products: number }) {
    if (stats.products > 0) {
      setConfirmingRemoveArea(true);
    } else {
      removeArea(false);
    }
  }

  function handleCellDrop(event: React.DragEvent, x: number, y: number) {
    event.preventDefault();
    setDragOverCell(null);
    if (!canManage) return;
    const payload = event.dataTransfer.getData('text/plain');
    if (payload === 'new-rack') {
      createRack(x, y);
    } else if (payload.startsWith('existing:')) {
      const rackId = Number(payload.split(':')[1]);
      moveRack(rackId, x, y);
    }
  }

  if (loading) {
    return <SkeletonRows count={3} />;
  }
  if (error) {
    return <div className="error">{error}</div>;
  }

  // ---------------- Area view ----------------
  if (currentArea) {
    const racks = withGridPositions(racksOf(currentArea.id));
    const capacity = currentArea.capacity;
    const atCapacity = capacity != null && racks.length >= capacity;
    const stats = areaStats(currentArea);

    const occupied = new Set(racks.map(r => `${r.gx},${r.gy}`));
    function sequentialCell(i: number) {
      return { x: i % GRID_COLS, y: Math.floor(i / GRID_COLS) };
    }
    function nextFreeCell() {
      let i = 0;
      while (occupied.has(`${sequentialCell(i).x},${sequentialCell(i).y}`)) i++;
      return sequentialCell(i);
    }

    // Always show every occupied cell, padded out to `capacity` total cells
    // (or just one spare "add here" cell when there's no capacity limit).
    const targetCellCount = capacity != null ? capacity : racks.length + 1;
    const cellMap = new Map<string, { x: number; y: number }>();
    for (const r of racks) cellMap.set(`${r.gx},${r.gy}`, { x: r.gx, y: r.gy });
    let fillIndex = 0;
    while (cellMap.size < targetCellCount) {
      const c = sequentialCell(fillIndex);
      cellMap.set(`${c.x},${c.y}`, c);
      fillIndex++;
    }
    const cells = Array.from(cellMap.values()).sort((a, b) => a.y - b.y || a.x - b.x);

    return (
      <div className="warehouse-view" key={`area-${currentArea.id}`}>
        <button className="ghost back-link" onClick={() => setAreaId(null)}>
          <ArrowLeft size={15} /> Back to Warehouse
        </button>

        <div className="area-view-header">
          <span className="area-view-icon">
            <AreaIcon name={currentArea.name} size={22} />
          </span>
          <div>
            <h2 style={{ margin: 0 }}>{currentArea.name}</h2>
            <p style={{ color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {stats.products} products · {stats.units} units
              {currentArea.description ? ` · ${currentArea.description}` : ''}
            </p>
          </div>
          {capacity != null && (
            <span className={`badge ${atCapacity ? 'badge-inactive' : 'badge-active'}`} style={{ marginLeft: 'auto' }}>
              {racks.length} / {capacity} Racks
            </span>
          )}
        </div>

        {canManage && (
          <div className="rack-toolbar">
            <div
              className={`rack-palette-chip ${atCapacity ? 'disabled' : ''}`}
              draggable={!atCapacity}
              onDragStart={e => e.dataTransfer.setData('text/plain', 'new-rack')}
              onClick={() => {
                if (atCapacity) return;
                const cell = nextFreeCell();
                createRack(cell.x, cell.y);
              }}
            >
              <Plus size={14} /> Drag or click to add a rack
            </div>
            {atCapacity && <span className="rack-capacity-warning">Maximum rack capacity reached.</span>}
          </div>
        )}

        <div className="rack-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}>
          {cells.map(({ x, y }) => {
            const rack = racks.find(r => r.gx === x && r.gy === y);
            const cellKey = `${x},${y}`;
            if (rack) {
              const rackStockDirect = stockByLocation.get(rack.id);
              const shelfCount = shelvesOf(rack.id).length;
              let products = rackStockDirect?.product_count ?? 0;
              let units = rackStockDirect?.total_units ?? 0;
              for (const shelf of shelvesOf(rack.id)) {
                const s = stockByLocation.get(shelf.id);
                products += s?.product_count ?? 0;
                units += s?.total_units ?? 0;
              }
              return (
                <div
                  key={rack.id}
                  className="rack-tile"
                  style={{ gridColumn: x + 1, gridRow: y + 1 }}
                  draggable={canManage}
                  onDragStart={e => e.dataTransfer.setData('text/plain', `existing:${rack.id}`)}
                  onClick={() => setSelectedRackId(rack.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter') setSelectedRackId(rack.id);
                  }}
                >
                  <Layers size={18} />
                  <strong>{rack.name}</strong>
                  <span className="rack-tile-meta">
                    {shelfCount} shelves · {products} products
                  </span>
                </div>
              );
            }
            const isDropTarget = cellKey === dragOverCell;
            return (
              <div
                key={cellKey}
                className={`rack-cell-empty ${isDropTarget ? 'rack-cell-dragover' : ''}`}
                style={{ gridColumn: x + 1, gridRow: y + 1 }}
                onDragOver={e => {
                  if (!canManage) return;
                  e.preventDefault();
                  setDragOverCell(cellKey);
                }}
                onDragLeave={() => setDragOverCell(null)}
                onDrop={e => handleCellDrop(e, x, y)}
              />
            );
          })}
        </div>

        {canManage && (
          <div className="danger-zone" style={{ marginTop: 24 }}>
            <h4>Danger Zone</h4>
            <button className="danger" onClick={() => handleRemoveAreaClick(stats)} disabled={removingArea}>
              <Trash2 size={14} /> {removingArea ? 'Removing...' : 'Remove Area'}
            </button>
          </div>
        )}

        {confirmingRemoveArea && (
          <RemoveLocationConfirm
            title="Remove Area?"
            targetName={currentArea.name}
            productCount={stats.products}
            totalUnits={stats.units}
            confirmLabel="Remove Anyway"
            onCancel={() => setConfirmingRemoveArea(false)}
            onConfirm={() => removeArea(true)}
          />
        )}

        {selectedRackId &&
          (() => {
            const rack = locations.find(l => l.id === selectedRackId);
            if (!rack) return null;
            return (
              <RackPanel
                token={token}
                rack={rack}
                shelves={shelvesOf(rack.id)}
                stockByLocation={stockByLocation}
                canManage={canManage}
                onClose={() => setSelectedRackId(null)}
                onChanged={refresh}
              />
            );
          })()}
      </div>
    );
  }

  // ---------------- Warehouse (areas) view ----------------
  return (
    <div className="warehouse-view" key="warehouse-root">
      {canManage && (
        <div className="inline-form" style={{ marginBottom: 16 }}>
          <button onClick={() => setAddingArea(a => !a)}>{addingArea ? 'Cancel' : '+ Add Area'}</button>
        </div>
      )}

      {addingArea && canManage && (
        <form onSubmit={addArea} className="card" style={{ marginBottom: 16 }}>
          <div className="inline-form">
            <input value={areaName} onChange={e => setAreaName(e.target.value)} placeholder="Area name (e.g. Shirt Area)" required />
            <input value={areaDescription} onChange={e => setAreaDescription(e.target.value)} placeholder="Description (optional)" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Max racks
              <input
                type="number"
                min={1}
                value={areaCapacity}
                onChange={e => setAreaCapacity(e.target.value)}
                style={{ width: 70 }}
              />
            </label>
            <button className="primary" disabled={savingArea}>
              {savingArea ? 'Creating...' : 'Create Area'}
            </button>
          </div>
        </form>
      )}

      {areas.length === 0 ? (
        <div className="empty-state">
          <h3>No storage areas yet</h3>
          <p>Add your first area (a room, section, or zone) to start laying out this warehouse.</p>
        </div>
      ) : (
        <div className="area-grid">
          {areas.map(area => {
            const stats = areaStats(area);
            return (
              <button key={area.id} className="area-card" onClick={() => setAreaId(area.id)}>
                <span className="area-card-icon">
                  <AreaIcon name={area.name} size={24} />
                </span>
                <div className="area-card-body">
                  <strong>{area.name}</strong>
                  <span className="area-card-meta">
                    {stats.racks} racks · {stats.products} products · {stats.units} units
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
