import React, { useState } from 'react';
import { AppLayout, TabItem } from '../components/ui/AppLayout';
import { DashboardView } from '../modules/dashboard/DashboardView';
import { ComprasView } from '../modules/compras/ComprasView';
import { InventarioView } from '../modules/inventario/InventarioView';
import { CxpView } from '../modules/cxp/CxpView';
import { CxcView } from '../modules/cxc/CxcView';
import { BancosView } from '../modules/bancos/BancosView';

export default function App() {
  const [activeModule, setActiveModule] = useState<string>('compras');
  const [activeComprasTab, setActiveComprasTab] = useState<string>('registros');
  const [activeInventarioTab, setActiveInventarioTab] = useState<string>('categorias');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const comprasTabs: TabItem[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'registros', label: 'Registros' },
  ];

  const inventarioTabs: TabItem[] = [
    { id: 'categorias', label: 'Categorías' },
    { id: 'marcas', label: 'Marcas' },
  ];

  const renderModuleView = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'compras':
        return (
          <ComprasView
            activeTab={activeComprasTab}
            onTabChange={(tabId: string) => setActiveComprasTab(tabId)}
          />
        );
      case 'inventario':
        return (
          <InventarioView
            activeTab={activeInventarioTab}
            onTabChange={(tabId: string) => setActiveInventarioTab(tabId)}
          />
        );
      case 'cuentas_pagar':
      case 'cxp':
        return <CxpView />;
      case 'cuentas_cobrar':
      case 'cxc':
        return <CxcView />;
      case 'bancos':
        return <BancosView />;
      default:
        return (
          <ComprasView
            activeTab={activeComprasTab}
            onTabChange={(tabId: string) => setActiveComprasTab(tabId)}
          />
        );
    }
  };

  const currentTabs = activeModule === 'compras'
    ? comprasTabs
    : activeModule === 'inventario'
    ? inventarioTabs
    : [];

  const currentActiveTab = activeModule === 'compras'
    ? activeComprasTab
    : activeModule === 'inventario'
    ? activeInventarioTab
    : undefined;

  return (
    <AppLayout
      activeModule={activeModule}
      onSelectModule={(moduleId: string) => setActiveModule(moduleId)}
      activeTab={currentActiveTab}
      onTabChange={(tabId: string) => {
        if (activeModule === 'compras') {
          setActiveComprasTab(tabId);
        } else if (activeModule === 'inventario') {
          setActiveInventarioTab(tabId);
        }
      }}
      tabs={currentTabs}
      searchQuery={searchQuery}
      onSearchChange={(query: string) => setSearchQuery(query)}
    >
      {renderModuleView()}
    </AppLayout>
  );
}
