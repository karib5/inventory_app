import React from 'react';
import { Location, Warehouse } from '../api';

const NO_WAREHOUSE = 'none';

export function locationPath(location: Location, allLocations: Location[]): string {
  const parts: string[] = [location.name];
  let current = location;
  while (current.parent_id !== null) {
    const parent = allLocations.find(l => l.id === current.parent_id);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(' / ');
}

export default function LocationPicker({
  warehouses,
  locations,
  warehouseId,
  locationId,
  onChange,
  onlyActive = true,
  required = false,
}: {
  warehouses: Warehouse[];
  locations: Location[];
  warehouseId: string;
  locationId: string;
  onChange: (warehouseId: string, locationId: string) => void;
  onlyActive?: boolean;
  required?: boolean;
}) {
  const usableLocations = onlyActive ? locations.filter(l => l.is_active) : locations;
  const hasUnassigned = usableLocations.some(l => l.warehouse_id === null);
  const locationsInScope = usableLocations.filter(l =>
    warehouseId === NO_WAREHOUSE ? l.warehouse_id === null : String(l.warehouse_id) === warehouseId,
  );

  function handleWarehouseChange(nextWarehouseId: string) {
    onChange(nextWarehouseId, '');
  }

  return (
    <>
      <div className="field">
        <label>Warehouse</label>
        <select value={warehouseId} onChange={e => handleWarehouseChange(e.target.value)} required={required}>
          <option value="">Select a warehouse...</option>
          {warehouses
            .filter(w => w.is_active)
            .map(w => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          {hasUnassigned && <option value={NO_WAREHOUSE}>Other locations</option>}
        </select>
      </div>
      <div className="field">
        <label>Location</label>
        <select
          value={locationId}
          onChange={e => onChange(warehouseId, e.target.value)}
          disabled={!warehouseId}
          required={required}
        >
          <option value="">{warehouseId ? 'Select a location...' : 'Choose a warehouse first'}</option>
          {locationsInScope.map(l => (
            <option key={l.id} value={l.id}>
              {locationPath(l, usableLocations)} ({l.code})
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
