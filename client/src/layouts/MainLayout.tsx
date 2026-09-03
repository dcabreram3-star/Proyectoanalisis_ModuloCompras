import React from 'react';

interface MainLayoutProps {
  children?: React.ReactNode;
}

const navItems = [
  { label: 'Dashboard', active: false },
  { label: 'Compras', active: true },
  { label: 'Inventario', active: false },
  { label: 'Cuentas por Pagar', active: false },
  { label: 'Cuentas por Cobrar', active: false },
  { label: 'Bancos', active: false },
];

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">E</span>
          System
        </div>

        {navItems.map((item) => (
          <div
            key={item.label}
            className={`sidebar-nav-item${item.active ? ' active' : ''}`}
          >
            {item.label}
          </div>
        ))}
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}