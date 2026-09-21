import React from 'react';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import { Product, Warehouse } from '../api';
import Thumbnail from './Thumbnail';

type Result = { kind: 'product'; product: Product } | { kind: 'warehouse'; warehouse: Warehouse };

export default function GlobalSearch({
  products,
  warehouses,
  onClose,
  onSelectProduct,
  onOpenWarehouse,
}: {
  products: Product[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onOpenWarehouse: (warehouseId: number) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();
  const results: Result[] = q
    ? [
        ...products
          .filter(
            p =>
              p.name.toLowerCase().includes(q) ||
              p.sku.toLowerCase().includes(q) ||
              (p.barcode ?? '').toLowerCase().includes(q),
          )
          .slice(0, 6)
          .map((product): Result => ({ kind: 'product', product })),
        ...warehouses
          .filter(w => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q))
          .slice(0, 3)
          .map((warehouse): Result => ({ kind: 'warehouse', warehouse })),
      ]
    : [];

  function select(result: Result) {
    if (result.kind === 'product') onSelectProduct(result.product);
    else onOpenWarehouse(result.warehouse.id);
    onClose();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') onClose();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    }
    if (event.key === 'Enter' && results[selectedIndex]) {
      select(results[selectedIndex]);
    }
  }

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search products by name, SKU, or barcode..."
        />
        {q && results.length === 0 && <div className="palette-empty">No matches for "{query}"</div>}
        {results.map((r, i) => (
          <div
            key={r.kind === 'product' ? `p${r.product.id}` : `w${r.warehouse.id}`}
            className={`palette-result${i === selectedIndex ? ' selected' : ''}`}
            onClick={() => select(r)}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            {r.kind === 'product' ? (
              <>
                <div className="thumb-row">
                  <Thumbnail src={r.product.image_url} alt={r.product.name} />
                  <div>
                    <div className="title">{r.product.name}</div>
                    <div className="subtitle">SKU {r.product.sku}</div>
                  </div>
                </div>
                <div className="subtitle">{r.product.quantity} units</div>
              </>
            ) : (
              <div className="thumb-row">
                <Thumbnail src={r.warehouse.image_url} alt={r.warehouse.name} icon={<WarehouseIcon size={18} />} />
                <div>
                  <div className="title">{r.warehouse.name}</div>
                  <div className="subtitle">Warehouse · {r.warehouse.code}</div>
                </div>
              </div>
            )}
          </div>
        ))}
        {!q && <div className="palette-empty">Type to search products and warehouses</div>}
      </div>
    </div>
  );
}
