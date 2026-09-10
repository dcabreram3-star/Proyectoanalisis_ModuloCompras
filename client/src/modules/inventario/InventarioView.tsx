import React from 'react';
import { CatalogoArticulos } from './views/CatalogoArticulos';
import { MovimientoCreacionView } from './components/MovimientoCreacionView';
import { AuditoriaView } from './components/AuditoriaView';
import { CategoriasCatalogView } from './components/CategoriasCatalogView';
import { MarcasCatalogView } from './components/MarcasCatalogView';

export interface InventarioViewProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  activeTab = 'articulos',
  onTabChange,
}) => {
  return (
    <div className="h-full w-full">
      {activeTab === 'articulos' && <CatalogoArticulos />}
      {activeTab === 'movimientos' && (
        <MovimientoCreacionView 
          onSuccess={() => {
            if (onTabChange) onTabChange('articulos');
          }}
        />
      )}
      {activeTab === 'auditoria' && <AuditoriaView />}
      {activeTab === 'categorias' && (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
          <CategoriasCatalogView />
        </div>
      )}
      {activeTab === 'marcas' && (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
          <MarcasCatalogView />
        </div>
      )}
    </div>
  );
};
