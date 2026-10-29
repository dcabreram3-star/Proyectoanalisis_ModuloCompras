/**
 * Tipos base para el motor de tours guiados y tutoriales interactivos en el ERP.
 * Compatible con resolución semántica por convención de layout.
 */
export type TourTarget =
  | 'header' // fila del título + botones de acción
  | 'action' // botón principal (el último de la cabecera)
  | 'filters' // tarjeta de búsqueda / filtros
  | 'table' // tabla de datos
  | 'rowActions' // iconos o menú de acción de la primera fila
  | 'pagination' // paginador
  | 'banner' // aviso informativo o banner de estado
  | { button: string } // botón cuyo texto contiene este valor
  | { css: string } // selector CSS dentro del área de trabajo o modal
  | { testId: string }; // atributo data-testid exacto

export interface TourStep {
  title: string;
  body: string;
  target?: TourTarget;
}

export interface Tutorial {
  /** Identificador único y estable del tutorial (clave de progreso en localStorage) */
  id: string;
  title: string;
  summary: string;
  /** Módulo de pertenencia (ej. 'compras', 'inventario', 'productos') */
  modulo: string;
  /** Nivel de la guía: 'macro' para visión integral del pipeline o 'micro' para pasos específicos */
  level?: 'macro' | 'micro';
  /** Subsección, categoría o pestaña */
  group?: string;
  /** Ruta o identificador de pantalla/tab donde se ejecuta */
  path?: string;
  tab?: string;
  /** TestId del modal en el que debe ejecutarse el tour (ej. 'modal-crear-solicitud') */
  modalTestId?: string;
  /** Selector CSS alternativo para el contenedor del modal si no usa data-testid */
  modalSelector?: string;
  /** TestId del contenedor de la vista/pantalla donde debe residir el tour (ej. 'panel-aprobacion') */
  viewTestId?: string;
  steps: TourStep[];
}

