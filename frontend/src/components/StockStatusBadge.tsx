import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { getStockStatus, STOCK_STATUS_LABEL } from '../utils';

const ICON_SIZE = 13;

export default function StockStatusBadge({ product }: { product: { quantity: number; minimum_stock_level: number } }) {
  const status = getStockStatus(product);
  if (status === 'out') {
    return (
      <span className="badge badge-inactive">
        <XCircle size={ICON_SIZE} /> {STOCK_STATUS_LABEL.out}
      </span>
    );
  }
  if (status === 'low') {
    return (
      <span className="badge badge-warn">
        <AlertTriangle size={ICON_SIZE} /> {STOCK_STATUS_LABEL.low}
      </span>
    );
  }
  return (
    <span className="badge badge-active">
      <CheckCircle2 size={ICON_SIZE} /> {STOCK_STATUS_LABEL['in-stock']}
    </span>
  );
}
