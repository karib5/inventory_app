import React from 'react';
import { ChevronDown, ChevronUp, Grid3x3, List, Search } from 'lucide-react';
import { Product, User, Warehouse } from '../api';
import Thumbnail from '../components/Thumbnail';
import StockStatusBadge from '../components/StockStatusBadge';
import { getStockStatus } from '../utils';

type StatusFilter = 'all' | 'in-stock' | 'low' | 'out';
type ViewMode = 'list' | 'grid';
const VIEW_STORAGE_KEY = 'inventory_view';

const VISIBLE_LOCATIONS = 2;

function LocationsCell({ product }: { product: Product }) {
  const [expanded, setExpanded] = React.useState(false);
  const locs = product.stock_locations;

  if (locs.length === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  const visible = expanded ? locs : locs.slice(0, VISIBLE_LOCATIONS);
  const hiddenCount = locs.length - visible.length;

  return (
    <div onClick={e => e.stopPropagation()}>
      {visible.map(loc => (
        <div key={loc.location_id} className="location-row">
          <span>
            {loc.location_code} — {loc.location_name}
          </span>
          <strong>{loc.quantity}</strong>
        </div>
      ))}
      {locs.length > VISIBLE_LOCATIONS && (
        <button
          type="button"
          className="ghost"
          style={{ padding: '4px 0', fontSize: 12 }}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? (
            <>
              <ChevronUp size={12} /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={12} /> View all ({hiddenCount} more)
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function Inventory({
  user,
  products,
  warehouses,
  initialStatusFilter,
  onSelectProduct,
  onAddProduct,
  onQuickAddStock,
}: {
  user: User;
  products: Product[];
  warehouses: Warehouse[];
  initialStatusFilter?: StatusFilter | null;
  onSelectProduct: (product: Product) => void;
  onAddProduct: () => void;
  onQuickAddStock: () => void;
}) {
  const canManageProducts = user.role === 'company_admin' || user.role === 'manager';
  const [query, setQuery] = React.useState('');
  const [warehouseFilter, setWarehouseFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(initialStatusFilter ?? 'all');
  const [view, setView] = React.useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || 'list';
    } catch {
      return 'list';
    }
  });

  function changeView(next: ViewMode) {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* per-viewer convenience only - fine if storage is unavailable */
    }
  }

  React.useEffect(() => {
    if (initialStatusFilter) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const filtered = products.filter(p => {
    const q = query.trim().toLowerCase();
    if (q) {
      const matches =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter !== 'all' && getStockStatus(p) !== statusFilter) return false;
    if (warehouseFilter && !p.stock_locations.some(loc => String(loc.warehouse_id) === warehouseFilter)) {
      return false;
    }
    return true;
  });

  if (products.length === 0) {
    return (
      <section className="card">
        <div className="empty-state">
          <h3>No products yet</h3>
          <p>Create your first product to start tracking inventory.</p>
          {canManageProducts && (
            <button className="primary" onClick={onAddProduct}>
              + Add Your First Product
            </button>
          )}
        </div>
      </section>
    );
  }

  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Inventory</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>
        Search by product name, SKU, or barcode.
      </p>

      {totalStock === 0 && (
        <section className="card">
          <div className="empty-state" style={{ padding: '16px 0' }}>
            <h3>Products exist, but there is no inventory yet.</h3>
            <button className="primary" onClick={onQuickAddStock}>
              + Add Stock
            </button>
          </div>
        </section>
      )}

      <div className="search-box">
        <Search size={16} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products by name, SKU, or barcode..."
          autoFocus
        />
      </div>

      <div className="inline-form" style={{ marginBottom: 16 }}>
        <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
          <option value="">All warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>
              {w.code} — {w.name}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
          <option value="all">All statuses</option>
          <option value="in-stock">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <div className="view-toggle" role="group" aria-label="Inventory view" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className={view === 'list' ? 'active' : ''}
            aria-pressed={view === 'list'}
            onClick={() => changeView('list')}
            title="List view"
          >
            <List size={15} /> List
          </button>
          <button
            type="button"
            className={view === 'grid' ? 'active' : ''}
            aria-pressed={view === 'grid'}
            onClick={() => changeView('grid')}
            title="Grid view"
          >
            <Grid3x3 size={15} /> Grid
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {filtered.length} of {products.length} products
            </span>
            {canManageProducts && (
              <button className="primary" onClick={onAddProduct}>
                + Add Product
              </button>
            )}
          </div>
          {filtered.length ? (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Available</th>
                  <th>Locations</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="clickable" onClick={() => onSelectProduct(p)}>
                    <td>
                      <Thumbnail src={p.image_url} alt={p.name} />
                    </td>
                    <td>{p.name}</td>
                    <td>{p.sku}</td>
                    <td>{p.quantity} units</td>
                    <td>
                      <LocationsCell product={p} />
                    </td>
                    <td>
                      <StockStatusBadge product={p} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>No products match these filters.</p>
          )}
        </section>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {filtered.length} of {products.length} products
            </span>
            {canManageProducts && (
              <button className="primary" onClick={onAddProduct}>
                + Add Product
              </button>
            )}
          </div>
          {filtered.length ? (
            <div className="product-grid">
              {filtered.map(p => (
                <div className="product-card" key={p.id} onClick={() => onSelectProduct(p)}>
                  <div className="product-card-image">
                    <Thumbnail src={p.image_url} alt={p.name} size="lg" />
                  </div>
                  <div className="product-card-body">
                    <div className="product-card-title" title={p.name}>
                      {p.name}
                    </div>
                    <div className="product-card-sku">SKU {p.sku}</div>
                    <div className="product-card-stats">
                      <div>
                        <strong>{p.quantity}</strong>
                        <span>Available</span>
                      </div>
                      <div>
                        <strong>{p.stock_locations.length}</strong>
                        <span>Location{p.stock_locations.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                    <StockStatusBadge product={p} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <section className="card">
              <p style={{ color: 'var(--text-muted)' }}>No products match these filters.</p>
            </section>
          )}
        </>
      )}
    </>
  );
}
