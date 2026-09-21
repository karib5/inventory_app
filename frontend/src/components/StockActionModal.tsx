import React from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { api, Location, Product, ProductStockLocation, User, Warehouse } from '../api';
import Modal from './Modal';
import LocationPicker from './LocationPicker';
import QuantityStepper from './QuantityStepper';
import Thumbnail from './Thumbnail';

export type StockActionMode = 'stock-in' | 'stock-out' | 'adjust' | 'transfer';

const TITLES: Record<StockActionMode, string> = {
  'stock-in': 'Add Stock',
  'stock-out': 'Remove Stock',
  adjust: 'Adjust Stock',
  transfer: 'Transfer Stock',
};

function confirmLabel(mode: StockActionMode, quantity: number): string {
  if (mode === 'stock-in') return `+ Add ${quantity || 0} Units`;
  if (mode === 'stock-out') return `− Remove ${quantity || 0} Units`;
  if (mode === 'transfer') return `⇄ Transfer ${quantity || 0} Units`;
  return 'Confirm Adjustment';
}

export default function StockActionModal({
  mode,
  token,
  products,
  warehouses,
  locations,
  initialProduct,
  onClose,
  onDone,
  onCreateProduct,
}: {
  mode: StockActionMode;
  token: string;
  user: User;
  products: Product[];
  warehouses: Warehouse[];
  locations: Location[];
  initialProduct?: Product;
  onClose: () => void;
  onDone: () => void;
  onCreateProduct: (searchTerm: string) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(initialProduct ?? null);
  const [stockByLocation, setStockByLocation] = React.useState<ProductStockLocation[]>([]);

  const [quantity, setQuantity] = React.useState(1);
  const [adjustQuantity, setAdjustQuantity] = React.useState('');
  const [note, setNote] = React.useState('');
  const [warehouseId, setWarehouseId] = React.useState('');
  const [locationId, setLocationId] = React.useState('');
  const [toWarehouseId, setToWarehouseId] = React.useState('');
  const [toLocationId, setToLocationId] = React.useState('');

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');

  React.useEffect(() => {
    if (!selectedProduct) return;
    api(`/products/${selectedProduct.id}/stock`, {}, token)
      .then(setStockByLocation)
      .catch(() => setStockByLocation([]));
  }, [selectedProduct]);

  const searching = query.trim().length > 0;
  const searchResults = searching
    ? products
        .filter(p => {
          const q = query.trim().toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.barcode ?? '').toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

  const quickPicks = React.useMemo(() => {
    if (mode === 'stock-out') {
      return [...products]
        .filter(p => p.quantity > 0)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 5);
    }
    if (mode === 'transfer') {
      return [...products]
        .filter(p => p.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    }
    return [...products].slice(-5).reverse();
  }, [products, mode]);

  const quickPickTitle =
    mode === 'stock-out' ? 'Products with lowest stock' : mode === 'transfer' ? 'Available inventory' : 'Recently used products';

  const availableAtSource = locationId
    ? stockByLocation.find(s => String(s.location_id) === locationId)?.quantity ?? 0
    : null;

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setQuery('');
    setQuantity(1);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedProduct) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'stock-in') {
        await api(
          '/inventory/stock-in',
          {
            method: 'POST',
            body: JSON.stringify({
              product_id: selectedProduct.id,
              quantity,
              location_id: locationId ? Number(locationId) : null,
              note: note || null,
            }),
          },
          token,
        );
        setSuccessMessage(`${quantity} units added successfully.`);
      } else if (mode === 'stock-out') {
        await api(
          '/inventory/stock-out',
          {
            method: 'POST',
            body: JSON.stringify({
              product_id: selectedProduct.id,
              quantity,
              location_id: locationId ? Number(locationId) : null,
              note: note || null,
            }),
          },
          token,
        );
        setSuccessMessage(`${quantity} units removed successfully.`);
      } else if (mode === 'adjust') {
        await api(
          '/inventory/adjust',
          {
            method: 'POST',
            body: JSON.stringify({
              product_id: selectedProduct.id,
              quantity_change: Number(adjustQuantity),
              location_id: locationId ? Number(locationId) : null,
              reason: note,
            }),
          },
          token,
        );
        setSuccessMessage('Stock adjusted successfully.');
      } else {
        await api(
          '/inventory/transfers',
          {
            method: 'POST',
            body: JSON.stringify({
              product_id: selectedProduct.id,
              from_location_id: Number(locationId),
              to_location_id: Number(toLocationId),
              quantity,
              note: note || null,
            }),
          },
          token,
        );
        setSuccessMessage(`${quantity} units transferred successfully.`);
      }
      onDone();
      setTimeout(onClose, 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (successMessage) {
    return (
      <Modal title={TITLES[mode]} onClose={onClose}>
        <div className="empty-state" style={{ color: 'var(--success)' }}>
          <CheckCircle2 size={40} style={{ marginBottom: 10 }} />
          <h3 style={{ color: 'var(--text)' }}>{successMessage}</h3>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={TITLES[mode]} onClose={onClose}>
      {!selectedProduct && (
        <>
          <div className="search-box">
            <Search size={16} />
            <input value={query} onChange={e => setQuery(e.target.value)} autoFocus placeholder="Search product..." />
          </div>

          {searching && searchResults.length === 0 && (
            <div className="empty-state">
              <p>No product found for "{query}".</p>
              <button className="primary" onClick={() => onCreateProduct(query)}>
                + Create Product
              </button>
            </div>
          )}

          {!searching && quickPicks.length > 0 && <p className="quick-pick-title">{quickPickTitle}</p>}

          {(searching ? searchResults : quickPicks).map(p => (
            <div key={p.id} className="palette-result" style={{ borderRadius: 8 }} onClick={() => selectProduct(p)}>
              <div className="thumb-row">
                <Thumbnail src={p.image_url} alt={p.name} />
                <div>
                  <div className="title">{p.name}</div>
                  <div className="subtitle">SKU {p.sku}</div>
                </div>
              </div>
              <div className="subtitle">{p.quantity} units</div>
            </div>
          ))}
        </>
      )}

      {selectedProduct && (
        <form onSubmit={submit}>
          <div className="thumb-row" style={{ marginBottom: 16 }}>
            <Thumbnail src={selectedProduct.image_url} alt={selectedProduct.name} size="lg" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedProduct.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>SKU {selectedProduct.sku}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Current stock: {selectedProduct.quantity}</div>
              {!initialProduct && (
                <button type="button" className="ghost" style={{ padding: '2px 0', fontSize: 12 }} onClick={() => setSelectedProduct(null)}>
                  Change product
                </button>
              )}
            </div>
          </div>

          {mode === 'transfer' ? (
            <>
              <h4 style={{ marginBottom: 4 }}>From</h4>
              <LocationPicker
                warehouses={warehouses}
                locations={locations}
                warehouseId={warehouseId}
                locationId={locationId}
                onChange={(w, l) => {
                  setWarehouseId(w);
                  setLocationId(l);
                }}
                required
              />
              {locationId && <p style={{ marginTop: -10, color: 'var(--text-muted)' }}>Available here: {availableAtSource}</p>}

              <div className="field">
                <label>Quantity</label>
                <QuantityStepper value={quantity} onChange={setQuantity} quickSteps={[5, 10]} />
              </div>

              <h4 style={{ marginBottom: 4 }}>To</h4>
              <LocationPicker
                warehouses={warehouses}
                locations={locations.filter(l => String(l.id) !== locationId)}
                warehouseId={toWarehouseId}
                locationId={toLocationId}
                onChange={(w, l) => {
                  setToWarehouseId(w);
                  setToLocationId(l);
                }}
                required
              />

              <div className="field">
                <label>Note (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </>
          ) : mode === 'adjust' ? (
            <>
              <div className="field">
                <label>Change (use - to reduce)</label>
                <input
                  type="number"
                  value={adjustQuantity}
                  onChange={e => setAdjustQuantity(e.target.value)}
                  required
                />
              </div>
              <LocationPicker
                warehouses={warehouses}
                locations={locations}
                warehouseId={warehouseId}
                locationId={locationId}
                onChange={(w, l) => {
                  setWarehouseId(w);
                  setLocationId(l);
                }}
                required
              />
              {locationId && <p style={{ marginTop: -10, color: 'var(--text-muted)' }}>Available here: {availableAtSource}</p>}
              <div className="field">
                <label>Reason (required)</label>
                <input value={note} onChange={e => setNote(e.target.value)} required />
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label>Quantity</label>
                <QuantityStepper value={quantity} onChange={setQuantity} quickSteps={[5, 10, 25]} />
              </div>

              <LocationPicker
                warehouses={warehouses}
                locations={locations}
                warehouseId={warehouseId}
                locationId={locationId}
                onChange={(w, l) => {
                  setWarehouseId(w);
                  setLocationId(l);
                }}
                required
              />
              {locationId && mode === 'stock-out' && (
                <p style={{ marginTop: -10, color: 'var(--text-muted)' }}>Available here: {availableAtSource}</p>
              )}

              <div className="field">
                <label>Note (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </>
          )}

          {error && <div className="error">{error}</div>}

          <div className="modal-actions">
            <button className="primary" disabled={busy}>
              {busy ? 'Saving...' : confirmLabel(mode, mode === 'adjust' ? Number(adjustQuantity) || 0 : quantity)}
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
