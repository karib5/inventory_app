import React from 'react';
import { Boxes, LogOut, Search } from 'lucide-react';
import { User } from '../api';

export type NavItem = { key: string; label: string; icon?: React.ReactNode };

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
  return (
    <div>
      <div className="topnav">
        <span className="brand">
          <Boxes size={20} /> Inventory
        </span>
        <nav>
          {navItems.map(item => (
            <button
              key={item.key}
              className={activeKey === item.key ? 'active' : ''}
              onClick={() => onNavigate(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <button className="search-trigger" onClick={onOpenSearch}>
          <Search size={15} /> Search <span className="kbd">Ctrl K</span>
        </button>
        <div className="userbar">
          <b>{user.name}</b>
          <span>{user.role.replace('_', ' ')}</span>
          <button onClick={onLogout}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>
      <div className="app-content">{children}</div>
    </div>
  );
}
