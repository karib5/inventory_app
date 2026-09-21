import React from 'react';
import { Search } from 'lucide-react';
import { Location, Product, User, Warehouse } from '../api';
import Thumbnail from '../components/Thumbnail';
import StockStatusBadge from '../components/StockStatusBadge';
import { getStockStatus } from '../utils';

type StatusFilter = 'all' | 'in-stock' | 'low' | 'out';

export default function Inventory({
  user,
  products,
  locations,
  warehouses,
  initialStatusFilter,
  onSelectProduct,
  onAddProduct,
  onQuickAddStock,
}: {
  user: User;
  products: Product[];
  locations: Location[];
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

  React.useEffect(() => {
    if (initialStatusFilter) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  function locationOf(product: Product) {
    if (product.location_id === null) return null;
    return locations.find(l => l.id === product.location_id) ?? null;
  }

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
    if (warehouseFilter) {
      const loc = locationOf(p);
      if (!loc || String(loc.warehouse_id) !== warehouseFilter) return false;
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
      </div>

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
                <th>Primary Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const loc = locationOf(p);
                return (
                  <tr key={p.id} className="clickable" onClick={() => onSelectProduct(p)}>
                    <td>
                      <Thumbnail src={p.image_url} alt={p.name} />
                    </td>
                    <td>{p.name}</td>
                    <td>{p.sku}</td>
                    <td>{p.quantity} units</td>
                    <td>{loc ? `${loc.code} — ${loc.name}` : '—'}</td>
                    <td>
                      <StockStatusBadge product={p} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>No products match these filters.</p>
        )}
      </section>
    </>
  );
}
