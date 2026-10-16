import { createBrowserRouter, Navigate, RouterProvider, useNavigate, useSearchParams } from 'react-router-dom';
import { ComponentShowcase } from '../components/ui/ComponentShowcase';
import { routes } from './routes';
import { AppErrorBoundary } from '../shared/components';
import { ToastProvider } from '../shared/components/Toast';
import { AuthProvider } from '../shared/auth/AuthContext';
import { ProtectedRoute } from '../modules/auth/ProtectedRoute';
import LoginPage from '../modules/auth/LoginPage';
import CambiarClavePage from '../modules/auth/CambiarClavePage';
import RecuperarClavePage from '../modules/auth/RecuperarClavePage';
import RestablecerClavePage from '../modules/auth/RestablecerClavePage';
import { useState } from 'react';
import { AppLayout } from '../components/ui/AppLayout';
import { DashboardView } from '../modules/dashboard/DashboardView';
import { ComprasView } from '../modules/compras/ComprasView';
import { ProductosView } from '../modules/productos/ProductosView';
import { InventarioView } from '../modules/inventario/InventarioView';
import { CxpView } from '../modules/cxp/CxpView';
import { CxcView } from '../modules/cxc/CxcView';
import { BancosView } from '../modules/bancos/BancosView';

/**
 * Shell de los módulos operativos (Compras, Productos, Inventario, ...): navegación por
 * estado dentro de AppLayout. CxC tiene su propio layout con rutas, así que al elegirlo
 * se navega a su dashboard.
 */
function ModulosErp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeModule, setActiveModule] = useState<string>(searchParams.get('modulo') ?? 'compras');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSelectModule = (moduleId: string) => {
    if (moduleId === 'cuentas_cobrar' || moduleId === 'cxc') {
      navigate('/cxc/dashboard');
      return;
    }
    setActiveModule(moduleId);
  };

  const renderModuleView = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'compras':
        return <ComprasView />;
      case 'productos':
        return <ProductosView />;
      case 'inventario':
        return <InventarioView />;
      case 'cuentas_pagar':
      case 'cxp':
        return <CxpView />;
      case 'cuentas_cobrar':
      case 'cxc':
        return <CxcView />;
      case 'bancos':
        return <BancosView />;
      default:
        return <ComprasView />;
    }
  };

  return (
    <AppLayout
      activeModule={activeModule}
      onSelectModule={handleSelectModule}
      tabs={[]}
      searchQuery={searchQuery}
      onSearchChange={(query: string) => setSearchQuery(query)}
    >
      {renderModuleView()}
    </AppLayout>
  );
}

const router = createBrowserRouter([
  // Públicas
  { path: '/login', element: <LoginPage /> },
  { path: '/cambiar-clave', element: <CambiarClavePage /> },
  { path: '/recuperar-clave', element: <RecuperarClavePage /> },
  { path: '/restablecer-clave', element: <RestablecerClavePage /> },
  // Protegidas: todo lo demás exige sesión.
  { path: '/', element: <ProtectedRoute><Navigate to="/cxc/dashboard" replace /></ProtectedRoute> },
  { path: '/modulos', element: <ProtectedRoute><ModulosErp /></ProtectedRoute> },
  { path: '/ui-kit', element: <ProtectedRoute><ComponentShowcase /></ProtectedRoute> },
  ...routes.map((r) => ({ ...r, element: <ProtectedRoute>{r.element}</ProtectedRoute> })),
  {
    path: '*',
    element: (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <section className="max-w-lg text-center">
          <p className="text-sm font-semibold text-blue-600">404</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Página no encontrada</h1>
          <p className="mt-2 text-sm text-slate-600">La dirección no corresponde a una pantalla disponible del ERP.</p>
          <a href="/" className="mt-5 inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Volver a Cuentas por Cobrar</a>
        </section>
      </main>
    ),
  },
]);

export default function App() {
  return (
    <AppErrorBoundary>
      <div className="erp-app min-h-screen bg-slate-50">
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </div>
    </AppErrorBoundary>
  );
}
