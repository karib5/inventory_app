import React from 'react';
import { Boxes, ChevronsLeft, ChevronsRight, LogOut, Menu, Search, X } from 'lucide-react';
import { User } from '../api';
import ThemeToggle from '../components/ThemeToggle';

export type NavItem = { key: string; label: string; icon?: React.ReactNode };

const COLLAPSE_STORAGE_KEY = 'inventory_sidebar_collapsed';

export default function AppShell({
  user,
  navItems,
  activeKey,
  onNavigate,
  onLogout,
  onOpenSearch,
  children,
}: {
  user: User;
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  onLogout: () => void;
  onOpenSearch: () => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* per-viewer convenience only */
      }
      return next;
    });
  }

  function navigate(key: string) {
    onNavigate(key);
    setMobileOpen(false);
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand">
            <Boxes size={20} />
            {!collapsed && 'Inventory'}
          </span>
          <button className="mobile-nav-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={activeKey === item.key ? 'active' : ''}
              onClick={() => navigate(item.key)}
              aria-current={activeKey === item.key ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle collapsed={collapsed} className="sidebar-collapse-toggle" />
          <button className="sidebar-collapse-toggle" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <b>{user.name}</b>
                <span>{user.role.replace('_', ' ')}</span>
              </div>
            )}
          </div>
          <button onClick={onLogout} title={collapsed ? 'Logout' : undefined}>
            <LogOut size={15} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <div className="app-main">
        <header className="topbar">
          <button className="mobile-nav-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <button className="search-trigger" onClick={onOpenSearch}>
            <Search size={15} /> Search <span className="kbd">Ctrl K</span>
          </button>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
