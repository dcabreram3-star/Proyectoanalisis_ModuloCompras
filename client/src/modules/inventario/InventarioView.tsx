import React from 'react';
import { CategoriasCatalogView } from './components/CategoriasCatalogView';
import { MarcasCatalogView } from './components/MarcasCatalogView';

export interface InventarioViewProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  activeTab = 'categorias',
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {activeTab === 'marcas' ? (
        <MarcasCatalogView />
      ) : (
        <CategoriasCatalogView />
      )}
    </div>
  );
};
