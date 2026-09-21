import React from 'react';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import { Warehouse } from '../api';

/** Full-bleed warehouse photo by default - name, stats, and actions live in
 * a bottom panel that's hidden until hover/focus, sliding up over a blurred
 * scrim so the top of the image always stays clear. Keyboard users get the
 * same reveal via :focus-within (the buttons inside are real, tabbable
 * controls), so nothing here is mouse-only. */
export default function WarehouseCard({
  warehouse,
  imageUrl,
  statusLabel,
  statusClass,
  archived,
  children,
}: {
  warehouse: Warehouse;
  imageUrl: string | null;
  statusLabel: string;
  statusClass: string;
  archived?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`warehouse-card ${archived ? 'warehouse-card-archived' : ''}`}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="wh-image" />
      ) : (
        <div className="wh-image-placeholder">
          <WarehouseIcon size={40} />
        </div>
      )}
      <div className="wh-overlay">
        <div className="wh-overlay-head">
          <div className="wh-overlay-name">
            <strong>{warehouse.name}</strong>
            <span>{warehouse.code}</span>
          </div>
          <span className={`badge ${statusClass}`}>{statusLabel}</span>
        </div>
        {warehouse.address && <p className="wh-overlay-address">{warehouse.address}</p>}
        <div className="wh-stats">
          <span>
            <strong>{warehouse.product_count}</strong> products
          </span>
          <span>
            <strong>{warehouse.total_units}</strong> units
          </span>
        </div>
        <div className="wh-overlay-actions">{children}</div>
      </div>
    </div>
  );
}
