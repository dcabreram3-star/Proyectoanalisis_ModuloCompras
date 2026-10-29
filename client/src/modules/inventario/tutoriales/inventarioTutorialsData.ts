import type { Tutorial } from '../../../shared/tutoriales';

export const INVENTARIO_TUTORIALS: Tutorial[] = [
  {
    id: 'inventario-articulos',
    title: 'Catálogo de Artículos y Paginación',
    summary: 'Administra el maestro de artículos con paginación optimizada, filtros y desactivación lógica.',
    modulo: 'inventario',
    group: 'articulos',
    tab: 'articulos',
    steps: [
      {
        title: 'Maestro de Artículos',
        body: 'Aquí consultas y gestionas todos los productos y suministros registrados en el almacén central.',
        target: 'header',
      },
      {
        title: 'Búsqueda con Debounce y Filtros',
        body: 'Filtra por descripción, código, categoría o marca. La búsqueda aplica una pausa preventiva (debounce) para optimizar las consultas a la base de datos Oracle.',
        target: 'filters',
      },
      {
        title: 'Listado y Existencias',
        body: 'Cada fila muestra el código, descripción, categoría, marca y el stock total consolidado sumando todas las bodegas.',
        target: 'table',
      },
      {
        title: 'Desactivación Lógica (Soft Delete)',
        body: 'Los artículos con historial o movimientos no se borran físicamente; se desactivan lógicamente para preservar la integridad histórica.',
        target: 'rowActions',
      },
      {
        title: 'Paginación Dinámica',
        body: 'Navega rápidamente entre páginas calculadas con base en el conteo total devuelto por el servidor.',
        target: 'pagination',
      },
    ],
  },
  {
    id: 'inventario-movimientos',
    title: 'Movimientos de Inventario',
    summary: 'Registra entradas, salidas y transferencias entre bodegas con validación estricta.',
    modulo: 'inventario',
    group: 'movimientos',
    tab: 'movimientos',
    steps: [
      {
        title: 'Registro de Movimientos',
        body: 'Gestiona entradas, salidas o traslados de mercancía entre bodegas para mantener el stock físico conciliado.',
        target: 'header',
      },
      {
        title: 'Tipo de Movimiento y Bodegas',
        body: 'Selecciona el tipo de operación autorizada. En transferencias, las bodegas de origen y destino deben ser distintas obligatoriamente.',
        target: 'filters',
      },
      {
        title: 'Validación de Cantidades y Costos',
        body: 'Regla de integridad: La cantidad debe ser un número entero estrictamente positivo (> 0). Se bloquean caracteres inválidos y números negativos.',
        target: 'table',
      },
      {
        title: 'Generación de Folio MOV',
        body: 'Al procesar la transacción, se genera un número de movimiento oficial con formato MOV-YYYY-XXXXX con estado APLICADO.',
        target: 'action',
      },
    ],
  },
  {
    id: 'inventario-toma-fisica',
    title: 'Toma Física y Ajuste Automático',
    summary: 'Apertura auditorías físicas, registra conteos reales y sincroniza diferencias.',
    modulo: 'inventario',
    group: 'toma_fisica',
    tab: 'auditoria',
    steps: [
      {
        title: 'Auditoría y Toma Física',
        body: 'Permite conciliar periódicamente el inventario en estantería contra los registros contables del sistema.',
        target: 'header',
      },
      {
        title: 'Apertura con Congelamiento de Stock',
        body: 'Al aperturar una toma en una bodega, el sistema congela el stock actual como saldo teórico y restringe la apertura de otra toma concurrente en la misma bodega.',
        target: 'filters',
      },
      {
        title: 'Captura de Conteo Físico',
        body: 'Ingresa las cantidades contadas en sitio. El sistema rechaza cualquier valor negativo o no entero.',
        target: 'table',
      },
      {
        title: 'Ajuste Atómico y Cierre',
        body: 'Al confirmar, el sistema calcula la diferencia y genera automáticamente los movimientos atómicos de ajuste (AJU_ENTRADA o AJU_SALIDA) actualizando la tabla maestra CMP_INVENTARIO.',
        target: 'action',
      },
    ],
  },
  {
    id: 'inventario-bodegas-ubicaciones',
    title: 'Gestión de Bodegas y Ubicaciones',
    summary: 'Organiza almacenes físicos, pasillos, estanterías y niveles.',
    modulo: 'inventario',
    group: 'bodegas',
    tab: 'bodegas',
    steps: [
      {
        title: 'Infraestructura de Almacén',
        body: 'Define bodegas centrales, sucursales y ubicaciones físicas específicas para una rápida localización de inventario.',
        target: 'header',
      },
      {
        title: 'Control de Estado Activo',
        body: 'Las bodegas inactivas se bloquean para nuevas compras o movimientos, previniendo errores de recepción.',
        target: 'table',
      },
    ],
  },
];

export const getInventarioTutorial = (idOrTab: string): Tutorial | undefined =>
  INVENTARIO_TUTORIALS.find((t) => t.id === idOrTab || t.tab === idOrTab) ?? INVENTARIO_TUTORIALS[0];
