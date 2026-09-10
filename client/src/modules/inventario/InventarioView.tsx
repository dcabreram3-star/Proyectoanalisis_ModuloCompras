import React from 'react';
import { CatalogoArticulos } from './views/CatalogoArticulos';
import { MovimientoCreacionView } from './components/MovimientoCreacionView';
import { AuditoriaView } from './components/AuditoriaView';

interface InventarioViewProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({ activeTab = 'articulos', onTabChange }) => {
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
    </div>
  );
};
