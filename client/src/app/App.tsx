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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeInventarioTab, setActiveInventarioTab] = useState<string>('articulos');

  const comprasTabs: TabItem[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'solicitudes', label: 'Crear Solicitud' },
    { id: 'registros', label: 'Registros' },
  ];

  const inventarioTabs: TabItem[] = [
    { id: 'articulos', label: 'Artículos' },
    { id: 'movimientos', label: 'Movimientos' },
    { id: 'auditoria', label: 'Auditoría' },
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

  const getActiveTabForModule = () => {
    if (activeModule === 'compras') return activeComprasTab;
    if (activeModule === 'inventario') return activeInventarioTab;
    return undefined;
  };

  const getTabsForModule = () => {
    if (activeModule === 'compras') return comprasTabs;
    if (activeModule === 'inventario') return inventarioTabs;
    return [];
  };

  return (
    <AppLayout
      activeModule={activeModule}
      onSelectModule={(moduleId: string) => setActiveModule(moduleId)}
      activeTab={getActiveTabForModule()}
      onTabChange={(tabId: string) => {
        if (activeModule === 'compras') setActiveComprasTab(tabId);
        if (activeModule === 'inventario') setActiveInventarioTab(tabId);
      }}
      tabs={getTabsForModule()}
      searchQuery={searchQuery}
      onSearchChange={(query: string) => setSearchQuery(query)}
    >
      {renderModuleView()}
    </AppLayout>
  );
}
