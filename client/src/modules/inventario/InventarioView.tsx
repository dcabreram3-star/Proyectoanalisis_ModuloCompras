import React from 'react';
import { BodegasCatalogView } from './components/BodegasCatalogView';
import { UbicacionesCatalogView } from './components/UbicacionesCatalogView';
import { LotesCatalogView } from './components/LotesCatalogView';
import { MovimientoCreacionView } from './components/MovimientoCreacionView';
import { TiposMovimientoCatalogView } from './components/TiposMovimientoCatalogView';
import { AuditoriaView } from './components/AuditoriaView';
import { FloatingHelpButton } from '../../shared/components';
import { FLUJO_INVENTARIO } from '../../shared/flowGuides';

export interface InventarioViewProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  activeTab = 'bodegas',
  onTabChange,
}) => {
  return (
    <div className="h-full w-full">
      <FloatingHelpButton
        titulo="Cómo funciona el módulo de Inventario"
        subtitulo="Bodegas, Ubicaciones y Artículos se preparan una vez; Lotes, Movimientos y Auditoría se usan seguido."
        pasos={FLUJO_INVENTARIO}
      />
      {activeTab === 'bodegas' && (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
          <BodegasCatalogView />
        </div>
      )}
      {activeTab === 'ubicaciones' && (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
          <UbicacionesCatalogView />
        </div>
      )}
      {activeTab === 'lotes' && (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
          <LotesCatalogView />
        </div>
      )}
      {activeTab === 'tipos-movimiento' && (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
          <TiposMovimientoCatalogView />
        </div>
      )}
      {activeTab === 'movimientos' && (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
          <MovimientoCreacionView 
            onSuccess={() => {
              if (onTabChange) onTabChange('movimientos');
            }}
          />
        </div>
      )}
      {activeTab === 'auditoria' && (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
          <AuditoriaView />
        </div>
      )}
    </div>
  );
};
