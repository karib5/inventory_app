import React from 'react';
import { ChevronRight, Grid3x3, List, Search } from 'lucide-react';
import { Product } from '../api';
import Thumbnail from '../components/Thumbnail';
import StockStatusBadge from '../components/StockStatusBadge';

type ViewMode = 'grid' | 'list';
const VIEW_STORAGE_KEY = 'inventory_products_view';

export default function Products({
  products,
  onSelectProduct,
  onAddProduct,
}: {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddProduct: () => void;
}) {
  const [query, setQuery] = React.useState('');
  const [view, setView] = React.useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || 'grid';
    } catch {
      return 'grid';
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

  const filtered = products.filter(p => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Products</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {products.length} product{products.length === 1 ? '' : 's'} in your catalog.
          </p>
        </div>
        <button className="primary" onClick={onAddProduct}>
          + Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <section className="card">
          <div className="empty-state">
            <h3>No products yet</h3>
            <p>Create your first product to start tracking inventory.</p>
            <button className="primary" onClick={onAddProduct}>
              + Add Your First Product
            </button>
          </div>
        </section>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="search-box" style={{ margin: 0, flex: 1, minWidth: 220 }}>
              <Search size={16} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search catalog by name, SKU, or barcode..."
              />
            </div>
            <div className="view-toggle" role="group" aria-label="Product list view">
              <button
                type="button"
                className={view === 'grid' ? 'active' : ''}
                aria-pressed={view === 'grid'}
                onClick={() => changeView('grid')}
                title="Grid view"
              >
                <Grid3x3 size={15} /> Grid
              </button>
              <button
                type="button"
                className={view === 'list' ? 'active' : ''}
                aria-pressed={view === 'list'}
                onClick={() => changeView('list')}
                title="List view"
              >
                <List size={15} /> List
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <section className="card">
              <p style={{ color: 'var(--text-muted)' }}>No products match "{query}".</p>
            </section>
          ) : view === 'grid' ? (
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
                        <span>In Stock</span>
                      </div>
                      <div>
                        <strong>{p.minimum_stock_level}</strong>
                        <span>Min Stock</span>
                      </div>
                    </div>
                    <StockStatusBadge product={p} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <section className="card">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Barcode</th>
                    <th>Current Stock</th>
                    <th>Min Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
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
                      <td>{p.barcode ?? '—'}</td>
                      <td>{p.quantity}</td>
                      <td>{p.minimum_stock_level}</td>
                      <td>
                        <StockStatusBadge product={p} />
                      </td>
                      <td>
                        <button
                          className="ghost icon-btn"
                          title="View / edit product"
                          onClick={e => {
                            e.stopPropagation();
                            onSelectProduct(p);
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </>
  );
}
