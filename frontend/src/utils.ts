export type StockStatus = 'in-stock' | 'low' | 'out';

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  'in-stock': 'In Stock',
  low: 'Low Stock',
  out: 'Out of Stock',
};

/** Single source of truth for stock status, used everywhere a product's
 * status is shown or filtered on. Zero units is always "out" regardless of
 * the threshold; below the threshold (but not zero) is "low"; at or above
 * it is "in-stock". A product can never be both low and out at once. */
export function getStockStatus(product: { quantity: number; minimum_stock_level: number }): StockStatus {
  if (product.quantity <= 0) return 'out';
  if (product.quantity < product.minimum_stock_level) return 'low';
  return 'in-stock';
}

export function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(dateString).toLocaleDateString();
}
