import React from 'react';
import { CheckCircle2, HelpCircle, Package, Wand2 } from 'lucide-react';
import { api, Location, Product, Warehouse } from '../api';
import Modal from './Modal';
import LocationPicker from './LocationPicker';
import QuantityStepper from './QuantityStepper';
import ImageUpload from './ImageUpload';

function generateSku(name: string): string {
  const base = name.trim().split(/\s+/)[0]?.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'ITEM';
  const number = String(Math.floor(1000 + Math.random() * 9000));
  return `${base.slice(0, 6)}-${number}`;
}

export default function AddProductModal({
  token,
  warehouses,
  locations,
  prefillName,
  autoReturnToStock,
  onClose,
  onCreated,
  onProductCreated,
}: {
  token: string;
  warehouses: Warehouse[];
  locations: Location[];
  prefillName?: string;
  autoReturnToStock?: boolean;
  onClose: () => void;
  onCreated: (product: Product, action: 'add-stock' | 'view' | 'add-another') => void;
  /** Fired the moment the product actually exists server-side, before the
   * user picks what to do next (Add Stock / View / Add Another / Done) -
   * every exit path, including just closing the success screen, needs the
   * parent's product list refreshed immediately, not only the two paths
   * that also navigate somewhere via onCreated. */
  onProductCreated: (product: Product) => void;
}) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [name, setName] = React.useState(prefillName ?? '');
  const [sku, setSku] = React.useState('');
  const [barcode, setBarcode] = React.useState('');
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [description, setDescription] = React.useState('');
  const [minStock, setMinStock] = React.useState('10');

  const [quantity, setQuantity] = React.useState(0);
  const [warehouseId, setWarehouseId] = React.useState('');
  const [locationId, setLocationId] = React.useState('');

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [created, setCreated] = React.useState<Product | null>(null);

  async function submitCreate(qty: number, locId: string) {
    setBusy(true);
    setError('');
    try {
      const product = await api(
        '/products',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            sku,
            barcode: barcode || null,
            description: description || null,
            image_url: imageUrl,
            minimum_stock_level: Number(minStock) || 10,
            quantity: qty,
            location_id: locId ? Number(locId) : null,
          }),
        },
        token,
      );
      onProductCreated(product);
      if (autoReturnToStock) {
        onCreated(product, 'add-stock');
        return;
      }
      setCreated(product);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create product');
    } finally {
      setBusy(false);
    }
  }

  function goToStep2(event: React.FormEvent) {
    event.preventDefault();
    if (autoReturnToStock) {
      submitCreate(0, '');
    } else {
      setStep(2);
    }
  }

  // Stock with nowhere to live is meaningless - if they're putting units
  // in right away, at least an area has to be picked (not just the
  // warehouse itself). With 0 units there's nothing to place yet, so no
  // location is required - they can add stock (and a location) later.
  const missingLocation = quantity > 0 && !locationId;

  async function createProduct(event: React.FormEvent) {
    event.preventDefault();
    if (missingLocation) return;
    await submitCreate(quantity, locationId);
  }

  function resetForAnother() {
    setStep(1);
    setImageUrl(null);
    setName('');
    setSku('');
    setBarcode('');
    setDescription('');
    setMinStock('10');
    setQuantity(0);
    setWarehouseId('');
    setLocationId('');
    setCreated(null);
    setError('');
  }

  return (
    <Modal title="Add Product" onClose={onClose}>
      <div className="step-indicator">
        <span className={step >= 1 ? 'done' : ''} />
        <span className={step >= 2 ? 'done' : ''} />
        <span className={step >= 3 ? 'done' : ''} />
      </div>

      {step === 1 && (
        <form onSubmit={goToStep2}>
          <div className="field">
            <label>Product Image</label>
            <ImageUpload token={token} value={imageUrl} onChange={setImageUrl} placeholderIcon={<Package size={28} />} />
          </div>
          <div className="field">
            <label>Product name</label>
            <input value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>
              SKU
              <span className="field-hint">Internal product code</span>
              <span className="help-tip">
                <HelpCircle size={14} style={{ marginLeft: 4, color: 'var(--text-muted)' }} />
                <span className="tooltip">
                  What is SKU? A unique code used to identify this product in your inventory.
                </span>
              </span>
            </label>
            <div className="inline-form" style={{ flexWrap: 'nowrap' }}>
              <input
                value={sku}
                onChange={e => setSku(e.target.value)}
                required
                placeholder="e.g. SHOE-001"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => setSku(generateSku(name || 'ITEM'))}>
                <Wand2 size={14} /> Generate
              </button>
            </div>
          </div>
          <div className="field">
            <label>
              Barcode <span className="field-hint">Optional — used for scanning products</span>
            </label>
            <input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Optional" />
          </div>
          <div className="field">
            <label>
              Low Stock Alert Level
              <span className="help-tip">
                <HelpCircle size={14} style={{ marginLeft: 4, color: 'var(--text-muted)' }} />
                <span className="tooltip">
                  Once stock falls below this number (but isn't zero), the product shows as "Low Stock" on the
                  dashboard and inventory list. Zero units always shows as "Out of Stock" instead. Defaults to
                  10 — change it to whatever makes sense for this product, and you can edit it later too.
                </span>
              </span>
            </label>
            <input type="number" min={0} value={minStock} onChange={e => setMinStock(e.target.value)} required />
          </div>
          {!showAdvanced ? (
            <button type="button" className="ghost" onClick={() => setShowAdvanced(true)}>
              Advanced options
            </button>
          ) : (
            <div className="field">
              <label>Description (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
          )}
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            <button className="primary" disabled={busy}>
              {busy ? 'Creating...' : autoReturnToStock ? 'Create Product' : 'Next: Initial Stock'}
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={createProduct}>
          <p style={{ color: 'var(--text-muted)', marginTop: -8 }}>
            Optional — you can also add stock later from the product's page.
          </p>
          <div className="field">
            <label>Initial quantity</label>
            <QuantityStepper value={quantity} onChange={setQuantity} min={0} quickSteps={[10, 50]} />
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
            required={quantity > 0}
          />
          {missingLocation && (
            <p className="location-empty-hint" style={{ marginTop: -10, color: 'var(--danger)' }}>
              Pick at least an area to place these {quantity} units in.
            </p>
          )}
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            <button className="primary" disabled={busy || missingLocation}>
              {busy ? 'Creating...' : 'Create Product'}
            </button>
            <button type="button" onClick={() => setStep(1)}>
              Back
            </button>
          </div>
        </form>
      )}

      {step === 3 && created && (
        <div>
          <div className="empty-state" style={{ padding: '12px 0 24px', color: 'var(--success)' }}>
            <CheckCircle2 size={40} style={{ marginBottom: 10 }} />
            <h3 style={{ color: 'var(--text)' }}>"{created.name}" created successfully.</h3>
            <p>
              SKU {created.sku}
              {quantity > 0 ? ` · ${quantity} units in stock` : ''}
            </p>
          </div>
          <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
            <button className="primary" onClick={() => onCreated(created, 'add-stock')}>
              + Add Stock
            </button>
            <button onClick={() => onCreated(created, 'view')}>View Product</button>
            <button onClick={resetForAnother}>Add Another Product</button>
            <button className="ghost" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
