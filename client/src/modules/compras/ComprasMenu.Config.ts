// Lista de catálogos y procesos del módulo de Compras/Inventario.
// "key" identifica cada pantalla; el componente real se conecta en ComprasModule.tsx
// A medida que cada integrante del equipo termine su CRUD, se reemplaza el placeholder
// correspondiente por su componente real (ver ComprasModule.tsx).

export interface ComprasMenuItem {
  key: string;
  label: string;
  grupo: 'Catálogos' | 'Procesos';
}

export const comprasMenuItems: ComprasMenuItem[] = [
  // --- Catálogos ---
  { key: 'articulos', label: 'Artículos', grupo: 'Catálogos' },
  { key: 'categorias', label: 'Categorías', grupo: 'Catálogos' },
  { key: 'marcas', label: 'Marcas', grupo: 'Catálogos' },
  { key: 'unidades-medida', label: 'Unidades de Medida', grupo: 'Catálogos' },
  { key: 'estados', label: 'Estados', grupo: 'Catálogos' },

  // --- Procesos ---
  { key: 'solicitudes', label: 'Solicitudes de Compra', grupo: 'Procesos' },
  { key: 'cotizaciones', label: 'Cotizaciones', grupo: 'Procesos' },
  { key: 'ordenes-compra', label: 'Órdenes de Compra', grupo: 'Procesos' },
  { key: 'recepciones', label: 'Recepciones de Bodega', grupo: 'Procesos' },
  { key: 'facturas-cxp', label: 'Facturas (a CxP)', grupo: 'Procesos' },
];