import React from 'react';
import { ArrowLeftRight, HelpCircle, Minus, Package, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { api, Product, ProductStockLocation, Transaction } from '../api';
import Drawer from './Drawer';
import { StockActionMode } from './StockActionModal';
import ActivityIcon from './ActivityIcon';
import ImageUpload from './ImageUpload';
import Thumbnail from './Thumbnail';
import StockStatusBadge from './StockStatusBadge';
import { showToast } from './Toast';
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

  const [editingDetails, setEditingDetails] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState('');
  const [savingDetails, setSavingDetails] = React.useState(false);

  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');
  const [name, setName] = React.useState(product.name);
  const [barcode, setBarcode] = React.useState(product.barcode ?? '');
  const [description, setDescription] = React.useState(product.description ?? '');
  const [minStock, setMinStock] = React.useState(String(product.minimum_stock_level));

  React.useEffect(() => {
    setName(product.name);
    setBarcode(product.barcode ?? '');
    setDescription(product.description ?? '');
    setMinStock(String(product.minimum_stock_level));
  }, [product.id, product.name, product.barcode, product.description, product.minimum_stock_level]);

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
      showToast(url ? 'Product image updated.' : 'Product image removed.');
      onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update image.', 'error');
    } finally {
      setSavingImage(false);
    }
  }

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    setSavingDetails(true);
    setDetailsError('');
    try {
      await api(
        `/products/${product.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name,
            barcode: barcode || null,
            description: description || null,
            minimum_stock_level: Number(minStock),
          }),
        },
        token,
      );
      showToast('Product details updated.');
      onChanged();
      setEditingDetails(false);
    } catch (e) {
      setDetailsError(e instanceof Error ? e.message : 'Failed to update product');
    } finally {
      setSavingDetails(false);
    }
  }

  async function deleteProduct() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' }, token);
      showToast(`"${product.name}" deleted.`);
      onChanged();
      onClose();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete product');
      setDeleting(false);
    }
  }

  if (editingDetails) {
    return (
      <Drawer onClose={onClose}>
        <form onSubmit={saveDetails}>
          <h2 style={{ marginTop: 0 }}>Edit Product Details</h2>
          <div className="field">
            <label>Product name</label>
            <input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Barcode</label>
            <input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Optional" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="field">
            <label>
              Minimum Stock
              <span className="help-tip">
                <HelpCircle size={14} style={{ marginLeft: 4, color: 'var(--text-muted)' }} />
                <span className="tooltip">
                  Below this number (but not zero) the product shows as "Low Stock" on the dashboard and
                  inventory list. Zero units always shows as "Out of Stock" regardless of this value.
                </span>
              </span>
            </label>
            <input type="number" min={0} value={minStock} onChange={e => setMinStock(e.target.value)} required />
          </div>
          {detailsError && <div className="error">{detailsError}</div>}
          <div className="modal-actions">
            <button className="primary" disabled={savingDetails}>
              {savingDetails ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setEditingDetails(false)} disabled={savingDetails}>
              Cancel
            </button>
          </div>
        </form>
      </Drawer>
    );
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <h2 style={{ margin: 0 }}>{product.name}</h2>
              <StockStatusBadge product={product} />
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
              SKU {product.sku}
              {product.barcode ? ` · Barcode ${product.barcode}` : ''}
            </p>
            {canEdit && (
              <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
                <button className="ghost" style={{ padding: '2px 0', fontSize: 12 }} onClick={() => setEditing(true)}>
                  <Pencil size={12} /> Edit image
                </button>
                <button className="ghost" style={{ padding: '2px 0', fontSize: 12 }} onClick={() => setEditingDetails(true)}>
                  <Pencil size={12} /> Edit details
                </button>
              </div>
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

      {canEdit && (
        <div className="drawer-section danger-zone">
          <h4>Danger Zone</h4>
          {confirmingDelete ? (
            <div className="danger-zone-confirm">
              <p>
                Delete <strong>{product.name}</strong>? This can't be undone.
              </p>
              {deleteError && <div className="error">{deleteError}</div>}
              <div className="modal-actions">
                <button className="danger" onClick={deleteProduct} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Yes, delete product'}
                </button>
                <button onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="danger" onClick={() => setConfirmingDelete(true)}>
              <Trash2 size={14} /> Delete Product
            </button>
          )}
        </div>
      )}
    </Drawer>
  );
}
