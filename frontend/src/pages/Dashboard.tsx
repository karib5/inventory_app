import React from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Minus,
  Package,
  PackagePlus,
  PackageX,
  Plus,
  ScanLine,
} from 'lucide-react';
import { api, Product, Transaction, User } from '../api';
import { StockActionMode } from '../components/StockActionModal';
import ActivityIcon from '../components/ActivityIcon';
import { getStockStatus, timeAgo } from '../utils';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard({
  token,
  user,
  products,
  refreshKey,
  onQuickAction,
  onAddProduct,
  onViewFiltered,
}: {
  token: string;
  user: User;
  products: Product[];
  refreshKey: number;
  onQuickAction: (mode: StockActionMode) => void;
  onAddProduct: () => void;
  onViewFiltered: (filter: 'low' | 'out') => void;
}) {
  const [recent, setRecent] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    api('/inventory/transactions?limit=6', {}, token)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, [refreshKey]);

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
  // Derived from the same products list Inventory/Products use, via the
  // shared getStockStatus() - a product can never land in both counts.
  const lowStockCount = products.filter(p => getStockStatus(p) === 'low').length;
  const outOfStock = products.filter(p => getStockStatus(p) === 'out').length;
  const needsAttention = lowStockCount + outOfStock;

  return (
    <>
      <div className="greeting">
        <h1>
          {greeting()}, {user.name.split(' ')[0]}
        </h1>
        <p>What would you like to do?</p>
      </div>

      <div className="quick-actions">
        {(user.role === 'company_admin' || user.role === 'manager') && (
          <button onClick={onAddProduct}>
            <span className="qa-icon">
              <PackagePlus size={18} />
            </span>
            Add Product
          </button>
        )}
        <button onClick={() => onQuickAction('stock-in')}>
          <span className="qa-icon">
            <Plus size={18} />
          </span>
          Add Stock
        </button>
        <button onClick={() => onQuickAction('stock-out')}>
          <span className="qa-icon">
            <Minus size={18} />
          </span>
          Remove Stock
        </button>
        <button onClick={() => onQuickAction('transfer')}>
          <span className="qa-icon">
            <ArrowLeftRight size={18} />
          </span>
          Transfer Stock
        </button>
        <button className="disabled" disabled title="Coming soon">
          <span className="qa-icon">
            <ScanLine size={18} />
          </span>
          Scan Barcode
        </button>
      </div>

      <section className="card">
        <h2>Inventory Overview</h2>
        <div className="stats" style={{ marginBottom: 0 }}>
          <div className="card">
            <span className="stat-icon">
              <Package size={19} />
            </span>
            <div>
              <strong>{totalProducts}</strong>
              <span>Total Products</span>
            </div>
          </div>
          <div className="card">
            <span className="stat-icon">
              <PackagePlus size={19} />
            </span>
            <div>
              <strong>{totalStock}</strong>
              <span>Total Stock</span>
            </div>
          </div>
          <div className="card">
            <span className="stat-icon warn">
              <PackageX size={19} />
            </span>
            <div>
              <strong>{lowStockCount}</strong>
              <span>Low Stock</span>
            </div>
          </div>
          <div className="card">
            <span className="stat-icon danger">
              <PackageX size={19} />
            </span>
            <div>
              <strong>{outOfStock}</strong>
              <span>Out of Stock</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Needs Attention</h2>
        {needsAttention ? (
          <div className="attention-list">
            {lowStockCount > 0 && (
              <div className="attention-row" onClick={() => onViewFiltered('low')}>
                <div className="att-left">
                  <span className="att-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                    <PackageX size={16} />
                  </span>
                  <span>Low Stock</span>
                </div>
                <span className="badge badge-warn">{lowStockCount} products</span>
              </div>
            )}
            {outOfStock > 0 && (
              <div className="attention-row" onClick={() => onViewFiltered('out')}>
                <div className="att-left">
                  <span className="att-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                    <PackageX size={16} />
                  </span>
                  <span>Out of Stock</span>
                </div>
                <span className="badge badge-inactive">{outOfStock} products</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)' }}>
            <CheckCircle2 size={20} />
            <span>Everything looks good.</span>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Recent Activity</h2>
        {recent.length ? (
          recent.map(t => (
            <div className="activity-row" key={t.id}>
              <ActivityIcon type={t.type} />
              <div>
                <div>
                  <strong>{t.product_name}</strong>{' '}
                  {t.quantity_change > 0 ? `+${t.quantity_change}` : t.quantity_change} units
                  {t.location_name ? ` · ${t.location_name}` : ''}
                </div>
                <div className="meta">
                  {timeAgo(t.created_at)} · {t.user_name}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No activity yet.</p>
        )}
      </section>
    </>
  );
}
