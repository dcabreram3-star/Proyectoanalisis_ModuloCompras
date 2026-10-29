import type { Tutorial } from '../../../shared/tutoriales';

export const PRODUCTOS_TUTORIALS: Tutorial[] = [
  {
    id: 'productos-delimitacion',
    title: 'Delimitación de Catálogos (PROD-001)',
    summary: 'Aprende a diferenciar el catálogo de artículos comerciales de los apartados de flota y conductores.',
    modulo: 'productos',
    group: 'delimitacion',
    tab: 'articulos',
    steps: [
      {
        title: 'Separación Conceptual y Visual',
        body: 'El módulo delimita claramente los artículos de inventario general respecto a registros de transporte, flota vehicular y conductores para evitar confusiones operativas.',
        target: 'header',
      },
      {
        title: 'Navegación por Catálogo',
        body: 'Usa las pestañas específicas para gestionar únicamente la entidad requerida: Artículos, Categorías, Marcas o Unidades de Medida.',
        target: 'filters',
      },
      {
        title: 'Consistencia de Maestro',
        body: 'Los productos creados aquí alimentan directamente los módulos de Compras (requisiciones) e Inventario (movimientos y existencias).',
        target: 'table',
      },
    ],
  },
  {
    id: 'productos-navegacion',
    title: 'Acceso Unificado al Módulo (PROD-002)',
    summary: 'Conoce los accesos directos desde el menú lateral único del ERP.',
    modulo: 'productos',
    group: 'navegacion',
    tab: 'hub',
    steps: [
      {
        title: 'Menú Lateral Centralizado',
        body: 'El sidebar del ERP es la única fuente de navegación de productos. Se eliminaron menús duplicados para una experiencia limpia y ágil.',
        target: 'header',
      },
      {
        title: 'Pestañas de Trabajo',
        body: 'Puedes alternar entre el catálogo maestro de artículos y sus tablas de soporte sin perder tu contexto de búsqueda.',
        target: 'filters',
      },
    ],
  },
  {
    id: 'productos-maestro',
    title: 'Gestión de Artículos y Clasificación',
    summary: 'Registra y clasifica productos con unidades de compra, venta y códigos oficiales.',
    modulo: 'productos',
    group: 'maestro',
    tab: 'articulos',
    steps: [
      {
        title: 'Alta de Producto',
        body: 'Define la descripción, categoría, marca, unidad de medida de compra y de venta.',
        target: 'header',
      },
      {
        title: 'Código Consecutivo ART',
        body: 'Cada artículo recibe un código único con prefijo ART-XXXX que garantiza su trazabilidad en almacén y compras.',
        target: 'action',
      },
      {
        title: 'Filtro Rápido',
        body: 'Busca por texto o código para verificar si un producto ya existe antes de crearlo nuevamente.',
        target: 'filters',
      },
    ],
  },
];

export const getProductosTutorial = (idOrTab: string): Tutorial | undefined =>
  PRODUCTOS_TUTORIALS.find((t) => t.id === idOrTab || t.tab === idOrTab) ?? PRODUCTOS_TUTORIALS[0];
