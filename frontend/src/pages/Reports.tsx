import React from 'react';
import { api, Product, Transaction, TransactionType } from '../api';
import StockStatusBadge from '../components/StockStatusBadge';
import { getStockStatus } from '../utils';

export default function Reports({ token, products }: { token: string; products: Product[] }) {
  const [tab, setTab] = React.useState<'movement' | 'low-stock'>('movement');
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [productFilter, setProductFilter] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<TransactionType | ''>('');
  const [error, setError] = React.useState('');

  // Same source and logic as everywhere else (Dashboard, Inventory,
  // Products) - a product below its own threshold but not at zero.
  const lowStock = products.filter(p => getStockStatus(p) === 'low');

  async function loadTransactions() {
    const params = new URLSearchParams();
    if (productFilter) params.set('product_id', productFilter);
    if (typeFilter) params.set('type', typeFilter);
    setTransactions(await api(`/inventory/transactions?${params.toString()}`, {}, token));
  }

  React.useEffect(() => {
    loadTransactions().catch(e => setError(e.message));
  }, [productFilter, typeFilter]);

  return (
    <>
      <h1 style={{ marginBottom: 16 }}>Reports</h1>
      <div className="tabs">
        <button className={tab === 'movement' ? 'active' : ''} onClick={() => setTab('movement')}>
          Stock Movement
        </button>
        <button className={tab === 'low-stock' ? 'active' : ''} onClick={() => setTab('low-stock')}>
          Low Stock ({lowStock.length})
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {tab === 'movement' && (
        <section className="card">
          <div className="inline-form" style={{ marginBottom: 12 }}>
            <select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
              <option value="">All products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TransactionType | '')}>
              <option value="">All types</option>
              <option value="stock_in">Stock In</option>
              <option value="stock_out">Stock Out</option>
              <option value="adjustment">Adjustment</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="transfer_in">Transfer In</option>
            </select>
          </div>
          {transactions.length ? (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Change</th>
                  <th>Before → After</th>
                  <th>By</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.created_at).toLocaleString()}</td>
                    <td>
                      {t.product_sku} — {t.product_name}
                    </td>
                    <td>{t.type.replace('_', ' ')}</td>
                    <td>{t.location_name ?? '—'}</td>
                    <td>{t.quantity_change > 0 ? `+${t.quantity_change}` : t.quantity_change}</td>
                    <td>
                      {t.previous_quantity} → {t.new_quantity}
                    </td>
                    <td>{t.user_name}</td>
                    <td>
                      {t.note ?? '—'}
                      {t.transfer_reference ? ` (${t.transfer_reference})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No transactions match these filters.</p>
          )}
        </section>
      )}

      {tab === 'low-stock' && (
        <section className="card">
          {lowStock.length ? (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current</th>
                  <th>Alert Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.sku}</td>
                    <td>{p.quantity}</td>
                    <td>{p.minimum_stock_level}</td>
                    <td>
                      <StockStatusBadge product={p} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Nothing is low on stock.</p>
          )}
        </section>
      )}
    </>
  );
}
