import React from 'react';
import { ArrowLeftRight, Minus, Package, Pencil, Plus, SlidersHorizontal } from 'lucide-react';
import { api, Product, ProductStockLocation, Transaction } from '../api';
import Drawer from './Drawer';
import { StockActionMode } from './StockActionModal';
import ActivityIcon from './ActivityIcon';
import ImageUpload from './ImageUpload';
import Thumbnail from './Thumbnail';
import { timeAgo } from '../utils';

export default function ProductDrawer({
  token,
  product,
  canAdjust,
  canEdit,
  refreshKey,
  onClose,
  onAction,
  onChanged,
}: {
  token: string;
  product: Product;
  canAdjust: boolean;
  canEdit: boolean;
  refreshKey: number;
  onClose: () => void;
  onAction: (mode: StockActionMode) => void;
  onChanged: () => void;
}) {
  const [stockByLocation, setStockByLocation] = React.useState<ProductStockLocation[]>([]);
  const [activity, setActivity] = React.useState<Transaction[]>([]);
  const [editing, setEditing] = React.useState(false);
  const [savingImage, setSavingImage] = React.useState(false);

  React.useEffect(() => {
    api(`/products/${product.id}/stock`, {}, token)
      .then(setStockByLocation)
      .catch(() => setStockByLocation([]));
    api(`/inventory/transactions?product_id=${product.id}&limit=5`, {}, token)
      .then(setActivity)
      .catch(() => setActivity([]));
  }, [product.id, refreshKey]);

  async function saveImage(url: string | null) {
    setSavingImage(true);
    try {
      await api(`/products/${product.id}`, { method: 'PATCH', body: JSON.stringify({ image_url: url }) }, token);
      onChanged();
    } finally {
      setSavingImage(false);
    }
  }

  return (
    <Drawer onClose={onClose}>
      {editing ? (
        <div className="field">
          <label>Product Image</label>
          <ImageUpload token={token} value={product.image_url} onChange={saveImage} placeholderIcon={<Package size={28} />} />
          <button style={{ marginTop: 12 }} onClick={() => setEditing(false)} disabled={savingImage}>
            Done
          </button>
        </div>
      ) : (
        <div className="thumb-row" style={{ marginBottom: 8 }}>
          <Thumbnail src={product.image_url} alt={product.name} size="lg" />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{product.name}</h2>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
              SKU {product.sku}
              {product.barcode ? ` · Barcode ${product.barcode}` : ''}
            </p>
            {canEdit && (
              <button className="ghost" style={{ padding: '2px 0', fontSize: 12 }} onClick={() => setEditing(true)}>
                <Pencil size={12} /> Edit image
              </button>
            )}
          </div>
        </div>
      )}

      <div className="stats" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0, marginTop: 16 }}>
        <div className="card">
          <span className="stat-icon">
            <Package size={18} />
          </span>
          <div>
            <strong>{product.quantity}</strong>
            <span>Total Stock</span>
          </div>
        </div>
        <div className="card">
          <span className="stat-icon warn">
            <SlidersHorizontal size={18} />
          </span>
          <div>
            <strong>{product.minimum_stock_level}</strong>
            <span>Minimum Level</span>
          </div>
        </div>
      </div>

      <div className="drawer-actions">
        <button className="primary" onClick={() => onAction('stock-in')}>
          <Plus size={14} /> Stock In
        </button>
        <button onClick={() => onAction('stock-out')}>
          <Minus size={14} /> Stock Out
        </button>
        <button onClick={() => onAction('transfer')}>
          <ArrowLeftRight size={14} /> Transfer
        </button>
        {canAdjust && (
          <button onClick={() => onAction('adjust')}>
            <SlidersHorizontal size={14} /> Adjust
          </button>
        )}
      </div>

      <div className="drawer-section">
        <h4>Locations</h4>
        {stockByLocation.length ? (
          stockByLocation.map(s => (
            <div className="location-row" key={s.location_id}>
              <span>
                {s.warehouse_name ? `${s.warehouse_name} / ` : ''}
                {s.location_name} ({s.location_code})
              </span>
              <strong>{s.quantity}</strong>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Not yet assigned to a specific location.</p>
        )}
      </div>

      <div className="drawer-section">
        <h4>Recent Activity</h4>
        {activity.length ? (
          activity.map(t => (
            <div className="activity-row" key={t.id}>
              <ActivityIcon type={t.type} />
              <div>
                <div>
                  {t.type.replace('_', ' ')}: {t.quantity_change > 0 ? `+${t.quantity_change}` : t.quantity_change}
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
      </div>
    </Drawer>
  );
}
