import React from 'react';
import { LayoutDashboard, Package, Settings as SettingsIcon, ClipboardList, BarChart3, Boxes } from 'lucide-react';
import { api, Location, Product, User, Warehouse } from '../api';
import AppShell, { NavItem } from '../layout/AppShell';
import GlobalSearch from '../components/GlobalSearch';
import StockActionModal, { StockActionMode } from '../components/StockActionModal';
import AddProductModal from '../components/AddProductModal';
import ProductDrawer from '../components/ProductDrawer';
import Dashboard from './Dashboard';
import Inventory from './Inventory';
import Products from './Products';
import Operations from './Operations';
import Reports from './Reports';
import Settings from './Settings';

type PageKey = 'dashboard' | 'inventory' | 'products' | 'operations' | 'reports' | 'settings';

type ModalState =
  | { kind: 'none' }
  | { kind: 'stock'; mode: StockActionMode; product?: Product }
  | { kind: 'add-product'; prefillName?: string; returnMode?: StockActionMode };

export default function Workspace({ token, user, onLogout }: { token: string; user: User; onLogout: () => void }) {
  const [page, setPage] = React.useState<PageKey>('dashboard');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [error, setError] = React.useState('');

  const [modal, setModal] = React.useState<ModalState>({ kind: 'none' });
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [jumpToWarehouseId, setJumpToWarehouseId] = React.useState<number | null>(null);
  const [inventoryStatusFilter, setInventoryStatusFilter] = React.useState<'low' | 'out' | null>(null);

  const canAdjust = user.role === 'company_admin' || user.role === 'manager';
  const isManager = user.role === 'company_admin' || user.role === 'manager';

  const navItems: NavItem[] = isManager
    ? [
        { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { key: 'inventory', label: 'Inventory', icon: <Boxes size={16} /> },
        { key: 'products', label: 'Products', icon: <Package size={16} /> },
        { key: 'operations', label: 'Operations', icon: <ClipboardList size={16} /> },
        { key: 'reports', label: 'Reports', icon: <BarChart3 size={16} /> },
        { key: 'settings', label: 'Settings', icon: <SettingsIcon size={16} /> },
      ]
    : [
        { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { key: 'inventory', label: 'Inventory', icon: <Boxes size={16} /> },
        { key: 'operations', label: 'Operations', icon: <ClipboardList size={16} /> },
      ];

  async function load() {
    const [productList, warehouseList, locationList] = await Promise.all([
      api('/products', {}, token),
      api('/warehouses', {}, token),
      api('/locations', {}, token),
    ]);
    setProducts(productList);
    setWarehouses(warehouseList);
    setLocations(locationList);
  }

  React.useEffect(() => {
    load().catch(e => setError(e.message));
  }, []);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function refresh() {
    await load();
    setRefreshKey(k => k + 1);
  }

  function openStockModal(mode: StockActionMode, product?: Product) {
    setModal({ kind: 'stock', mode, product });
  }

  function openAddProduct(prefillName?: string, returnMode?: StockActionMode) {
    setModal({ kind: 'add-product', prefillName, returnMode });
  }

  function handleProductCreated(product: Product, action: 'add-stock' | 'view') {
    const returnMode = modal.kind === 'add-product' ? modal.returnMode : undefined;
    setModal({ kind: 'none' });
    refresh().then(() => {
      if (action === 'add-stock') {
        openStockModal(returnMode ?? 'stock-in', product);
      } else {
        setSelectedProduct(product);
      }
    });
  }

  return (
    <AppShell
      user={user}
      navItems={navItems}
      activeKey={page}
      onNavigate={key => setPage(key as PageKey)}
      onLogout={onLogout}
      onOpenSearch={() => setSearchOpen(true)}
    >
      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      {page === 'dashboard' && (
        <Dashboard
          token={token}
          user={user}
          products={products}
          refreshKey={refreshKey}
          onQuickAction={mode => openStockModal(mode)}
          onAddProduct={() => openAddProduct()}
          onViewFiltered={filter => {
            setInventoryStatusFilter(filter);
            setPage('inventory');
          }}
        />
      )}

      {page === 'inventory' && (
        <Inventory
          user={user}
          products={products}
          locations={locations}
          warehouses={warehouses}
          initialStatusFilter={inventoryStatusFilter}
          onSelectProduct={setSelectedProduct}
          onAddProduct={() => openAddProduct()}
          onQuickAddStock={() => openStockModal('stock-in')}
        />
      )}

      {page === 'products' && isManager && (
        <Products products={products} onSelectProduct={setSelectedProduct} onAddProduct={() => openAddProduct()} />
      )}

      {page === 'operations' && <Operations onTransfer={() => openStockModal('transfer')} />}

      {page === 'reports' && isManager && <Reports token={token} products={products} />}

      {page === 'settings' && isManager && (
        <Settings
          token={token}
          user={user}
          warehouses={warehouses}
          locations={locations}
          onChanged={refresh}
          initialWarehouseId={jumpToWarehouseId}
        />
      )}

      {selectedProduct && (
        <ProductDrawer
          token={token}
          product={products.find(p => p.id === selectedProduct.id) ?? selectedProduct}
          canAdjust={canAdjust}
          canEdit={isManager}
          refreshKey={refreshKey}
          onClose={() => setSelectedProduct(null)}
          onAction={mode => openStockModal(mode, selectedProduct)}
          onChanged={refresh}
        />
      )}

      {modal.kind === 'stock' && (
        <StockActionModal
          mode={modal.mode}
          token={token}
          user={user}
          products={products}
          warehouses={warehouses}
          locations={locations}
          initialProduct={modal.product}
          onClose={() => setModal({ kind: 'none' })}
          onDone={refresh}
          onCreateProduct={term => openAddProduct(term, modal.mode)}
        />
      )}

      {modal.kind === 'add-product' && (
        <AddProductModal
          token={token}
          warehouses={warehouses}
          locations={locations}
          prefillName={modal.prefillName}
          autoReturnToStock={!!modal.returnMode}
          onClose={() => setModal({ kind: 'none' })}
          onCreated={handleProductCreated}
        />
      )}

      {searchOpen && (
        <GlobalSearch
          products={products}
          warehouses={isManager ? warehouses : []}
          onClose={() => setSearchOpen(false)}
          onSelectProduct={setSelectedProduct}
          onOpenWarehouse={id => {
            setJumpToWarehouseId(id);
            setPage('settings');
          }}
        />
      )}
    </AppShell>
  );
}
