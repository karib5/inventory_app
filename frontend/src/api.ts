export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
export const API = `${API_ORIGIN}/api`;

export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
}

export type Role = 'super_admin' | 'company_admin' | 'manager' | 'staff';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  company_id: number | null;
  is_active: boolean;
};

export type Company = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type CompanyDetail = Company & {
  user_count: number;
  location_count: number;
  product_count: number;
};

export type LocationType = 'zone' | 'aisle' | 'rack' | 'shelf' | 'bin';

export type Warehouse = {
  id: number;
  company_id: number;
  code: string;
  name: string;
  address: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  product_count: number;
  total_units: number;
};

export type WarehouseDetail = Warehouse & {
  location_count: number;
};

export type Location = {
  id: number;
  company_id: number;
  warehouse_id: number | null;
  parent_id: number | null;
  location_type: LocationType | null;
  name: string;
  code: string;
  is_active: boolean;
};

export type Product = {
  id: number;
  company_id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity: number;
  minimum_stock_level: number;
  location_id: number | null;
};

export type TransactionType = 'stock_in' | 'stock_out' | 'adjustment' | 'transfer_out' | 'transfer_in';

export type Transaction = {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  location_id: number | null;
  location_name: string | null;
  transfer_id: number | null;
  transfer_reference: string | null;
  user_id: number;
  user_name: string;
  type: TransactionType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  note: string | null;
  created_at: string;
};

export type ProductStockLocation = {
  location_id: number;
  location_code: string;
  location_name: string;
  warehouse_id: number | null;
  warehouse_name: string | null;
  quantity: number;
};

export type Transfer = {
  id: number;
  reference: string;
  product_id: number;
  product_name: string;
  product_sku: string;
  from_location_id: number;
  from_location_name: string;
  to_location_id: number;
  to_location_name: string;
  quantity: number;
  user_id: number;
  user_name: string;
  note: string | null;
  created_at: string;
};

export async function api(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof URLSearchParams) &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data.detail === 'string'
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail.map((item: any) => item.msg).join(', ')
          : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

export async function uploadImage(file: File, token: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const result = await api('/uploads', { method: 'POST', body: formData }, token);
  return result.url as string;
}
