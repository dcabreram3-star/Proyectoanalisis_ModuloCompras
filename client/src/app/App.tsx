import MainLayout from '../layouts/MainLayout';
import ComprasModule from '../modules/compras/ComprasModule';

export default function App() {
  return (
    <MainLayout>
      {/* Por ahora mostramos directo el módulo de Compras.
          Cuando existan más módulos (Inventario, CxP, CxC, Bancos),
          aquí entra el router (routes.tsx) para navegar entre ellos. */}
      <ComprasModule />
    </MainLayout>
  );
}