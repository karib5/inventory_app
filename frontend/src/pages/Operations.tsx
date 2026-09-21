import React from 'react';
import { AlertTriangle, ArrowLeftRight, ClipboardCheck, ReceiptText, Undo2 } from 'lucide-react';

export default function Operations({ onTransfer }: { onTransfer: () => void }) {
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Operations</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>Choose the operation you need.</p>

      <div className="tile-grid">
        <div className="tile" onClick={onTransfer}>
          <span className="tile-icon">
            <ArrowLeftRight size={18} />
          </span>
          <span className="tile-title">Stock Transfer</span>
          <span className="tile-desc">Move stock between warehouses or locations.</span>
        </div>
        <div className="tile disabled" title="Coming soon">
          <span className="tile-icon">
            <ClipboardCheck size={18} />
          </span>
          <span className="tile-title">Stock Count</span>
          <span className="tile-desc">Physical counts and reconciliation. Coming soon.</span>
        </div>
        <div className="tile disabled" title="Coming soon">
          <span className="tile-icon">
            <Undo2 size={18} />
          </span>
          <span className="tile-title">Returns</span>
          <span className="tile-desc">Customer and supplier returns. Coming soon.</span>
        </div>
        <div className="tile disabled" title="Coming soon">
          <span className="tile-icon">
            <AlertTriangle size={18} />
          </span>
          <span className="tile-title">Damaged / Lost Stock</span>
          <span className="tile-desc">Record write-offs with an audit trail. Coming soon.</span>
        </div>
        <div className="tile disabled" title="Coming soon">
          <span className="tile-icon">
            <ReceiptText size={18} />
          </span>
          <span className="tile-title">Purchase Orders</span>
          <span className="tile-desc">Order from suppliers and receive stock. Coming soon.</span>
        </div>
      </div>
    </>
  );
}
