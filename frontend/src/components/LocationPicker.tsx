import React from 'react';
import { ChevronRight, Layers, MapPin } from 'lucide-react';
import { Location, Warehouse } from '../api';
import AreaIcon from './AreaIcon';

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

/** Same Warehouse -> Area -> Rack -> Shelf hierarchy as the visual warehouse
 * builder, but built for picking a single location rather than editing the
 * layout: click an area, then (optionally) a rack inside it, then
 * (optionally) a shelf inside that - each click both selects that node and,
 * if it has anything inside it, reveals the next level. You can stop
 * drilling at any level (an area or a rack is a valid location on its own),
 * exactly like the flat picker this replaces already allowed. */
export default function LocationPicker({
  warehouses,
  locations,
  warehouseId,
  locationId,
  onChange,
  onlyActive = true,
  required = false,
  productStockByLocation,
}: {
  warehouses: Warehouse[];
  locations: Location[];
  warehouseId: string;
  locationId: string;
  onChange: (warehouseId: string, locationId: string) => void;
  onlyActive?: boolean;
  required?: boolean;
  /** When set, every node shows how many units of THIS product sit there
   * (itself plus everything inside it) instead of a child-location count -
   * used wherever the picker is choosing where to move an already-selected
   * product's stock (stock out, transfer), rather than a brand-new
   * location with nothing in it yet. Keyed by location id -> quantity. */
  productStockByLocation?: Map<number, number>;
}) {
  const usableLocations = onlyActive ? locations.filter(l => l.is_active) : locations;
  const hasUnassigned = usableLocations.some(l => l.warehouse_id === null);
  const locationsInScope = usableLocations.filter(l =>
    warehouseId === NO_WAREHOUSE ? l.warehouse_id === null : String(l.warehouse_id) === warehouseId,
  );

  // The chain of node ids the user has drilled through, root -> deepest.
  const [path, setPath] = React.useState<number[]>([]);

  // Reconstruct the drill-down chain when a location arrives pre-selected
  // (or is cleared), so the widget always reflects what's actually chosen.
  React.useEffect(() => {
    if (!locationId) {
      setPath([]);
      return;
    }
    const chain: number[] = [];
    let current = usableLocations.find(l => String(l.id) === locationId);
    while (current) {
      chain.unshift(current.id);
      const parentId: number | null = current.parent_id;
      current = parentId != null ? usableLocations.find(l => l.id === parentId) : undefined;
    }
    setPath(chain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  function handleWarehouseChange(nextWarehouseId: string) {
    setPath([]);
    onChange(nextWarehouseId, '');
  }

  function selectNode(node: Location) {
    setPath(prev => [...prev, node.id]);
    onChange(warehouseId, String(node.id));
  }

  function jumpToRoot() {
    setPath([]);
    onChange(warehouseId, '');
  }

  function jumpToDepth(depth: number) {
    const newPath = path.slice(0, depth + 1);
    setPath(newPath);
    onChange(warehouseId, String(newPath[newPath.length - 1]));
  }

  function stockAt(nodeId: number): number {
    if (!productStockByLocation) return 0;
    let total = productStockByLocation.get(nodeId) ?? 0;
    for (const child of locationsInScope.filter(l => l.parent_id === nodeId)) {
      total += stockAt(child.id);
    }
    return total;
  }

  const pathNodes = path.map(id => usableLocations.find(l => l.id === id)).filter((l): l is Location => !!l);
  const currentParentId = pathNodes.length ? pathNodes[pathNodes.length - 1].id : null;
  // If the current node itself directly holds stock of this product, that
  // IS where it lives - a rack with 3 units in it, and two empty shelves
  // underneath, must not let you "select" a shelf that actually has 0.
  // Drilling only makes sense when the node's own row is empty and the
  // stock is genuinely divided among what's inside it.
  const currentDirectStock =
    productStockByLocation && currentParentId != null ? productStockByLocation.get(currentParentId) ?? 0 : 0;
  const stockHeldDirectly = productStockByLocation != null && currentDirectStock > 0;
  const currentChildren = stockHeldDirectly
    ? []
    : locationsInScope
        .filter(l => l.parent_id === currentParentId)
        .sort((a, b) => (a.position_x ?? a.id) - (b.position_x ?? b.id));

  const warehouseObj = warehouses.find(w => String(w.id) === warehouseId);
  // Locations with no warehouse ("Other locations") have no hierarchy to
  // browse - fall back to a plain list for that one legacy case.
  const isFlatFallback = warehouseId === NO_WAREHOUSE;

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
        {!warehouseId ? (
          <p className="location-empty-hint">Choose a warehouse first.</p>
        ) : isFlatFallback ? (
          <select value={locationId} onChange={e => onChange(warehouseId, e.target.value)} required={required}>
            <option value="">Select a location...</option>
            {locationsInScope.map(l => (
              <option key={l.id} value={l.id}>
                {locationPath(l, usableLocations)} ({l.code})
              </option>
            ))}
          </select>
        ) : (
          <div className="location-drilldown">
            <div className="location-breadcrumb">
              <button
                type="button"
                className={`location-crumb ${path.length === 0 ? 'location-crumb-active' : ''}`}
                onClick={jumpToRoot}
              >
                <MapPin size={13} /> {warehouseObj?.name ?? 'Warehouse'}
              </button>
              {pathNodes.map((node, i) => (
                <React.Fragment key={node.id}>
                  <ChevronRight size={13} className="location-crumb-sep" />
                  <button
                    type="button"
                    className={`location-crumb ${i === pathNodes.length - 1 ? 'location-crumb-active' : ''}`}
                    onClick={() => jumpToDepth(i)}
                  >
                    {node.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {currentChildren.length > 0 ? (
              <div className="location-node-grid">
                {currentChildren.map(node => {
                  const childCount = locationsInScope.filter(l => l.parent_id === node.id).length;
                  const meta = productStockByLocation
                    ? `${stockAt(node.id)} available`
                    : childCount > 0
                      ? `${childCount} inside`
                      : node.code;
                  return (
                    <button type="button" key={node.id} className="location-node" onClick={() => selectNode(node)}>
                      <span className="location-node-icon">
                        {path.length === 0 ? <AreaIcon name={node.name} size={17} /> : <Layers size={17} />}
                      </span>
                      <span className="location-node-body">
                        <strong>{node.name}</strong>
                        <span className="location-node-meta">{meta}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="location-empty-hint">
                {stockHeldDirectly
                  ? `All ${currentDirectStock} unit${currentDirectStock === 1 ? '' : 's'} here are stored directly on this one, not split into anything inside it - the selection above will be used.`
                  : pathNodes.length
                    ? 'Nothing stored inside this one yet - the selection above will be used.'
                    : 'This warehouse has no storage zones set up yet.'}
              </p>
            )}

            {required && (
              // The drilldown above has no native form control of its own to
              // anchor HTML5 "required" validation to - this keeps that
              // validation working (and the browser's own prompt pointing
              // at the right spot) without being visible or focusable by tab.
              <input
                className="location-required-shim"
                value={locationId}
                required
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                onChange={() => {}}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
