import React from 'react';
import { Search } from 'lucide-react';
import { Product } from '../api';
import Thumbnail from '../components/Thumbnail';

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

  const filtered = products.filter(p => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Products</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Your product catalog.</p>
        </div>
        <button className="primary" onClick={onAddProduct}>
          + Add Product
        </button>
      </div>

      <div className="search-box">
        <Search size={16} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search catalog..." />
      </div>

      <section className="card">
        {products.length === 0 ? (
          <div className="empty-state">
            <h3>No products yet.</h3>
            <button className="primary" onClick={onAddProduct}>
              + Add Your First Product
            </button>
          </div>
        ) : filtered.length ? (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>SKU</th>
                <th>Barcode</th>
                <th>Total Stock</th>
                <th>Min Stock</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>No products match "{query}".</p>
        )}
      </section>
    </>
  );
}
