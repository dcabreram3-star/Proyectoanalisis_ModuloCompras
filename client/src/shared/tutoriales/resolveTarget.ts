import type { TourTarget } from './tutorialTypes';

export interface ResolveTargetContext {
  modalTestId?: string;
  modalSelector?: string;
  viewTestId?: string;
}

const getWorkArea = () =>
  document.getElementById('main-scroll-container') ||
  document.getElementById('main-content') ||
  document.body;

/** Fila de título: primer ancestro flex del h1 o h2 sin salirse del área de trabajo. */
const headerRow = (main: HTMLElement): HTMLElement | null => {
  const heading = main.querySelector('h1, h2');
  if (!heading) return null;
  let node: HTMLElement | null = heading.parentElement;
  while (node && node !== main) {
    if (node.classList.contains('flex') || node.classList.contains('justify-between')) {
      return node;
    }
    node = node.parentElement;
  }
  return heading.parentElement;
};

const visible = (el: Element | null): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/**
 * Devuelve el elemento DOM a resaltar según el objetivo semántico del paso y su contexto.
 * - Si context.modalTestId / modalSelector está definido: busca ESTRICTAMENTE dentro del modal activo.
 *   Si el modal no está montado o no es visible, retorna null para que el tour espere.
 * - Si context.viewTestId está definido: valida que la vista pertenezca a la pantalla actual.
 *   Si la vista no está montada o visible, retorna null impidiendo ejecuciones desalineadas.
 */
export const resolveTarget = (
  target: TourTarget | undefined,
  context?: ResolveTargetContext,
): HTMLElement | null => {
  if (!target) return null;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ÁMBITO ESTRICTO DE MODAL (Ej. Creación de Solicitudes)
  // ─────────────────────────────────────────────────────────────────────────────
  if (context?.modalTestId || context?.modalSelector) {
    const modalSelector =
      context.modalSelector || `[data-testid="${context.modalTestId}"]`;
    const modalEl = document.querySelector(modalSelector) as HTMLElement | null;

    // Si el modal aún no se ha montado o no tiene dimensiones visibles, esperar
    if (!modalEl || !visible(modalEl)) {
      return null;
    }

    // Si el objetivo es el contenedor completo del propio modal
    if (typeof target === 'object' && 'testId' in target && target.testId === context.modalTestId) {
      return modalEl;
    }

    let el: Element | null = null;
    if (typeof target === 'object') {
      if ('testId' in target) {
        el = modalEl.querySelector(`[data-testid="${target.testId}"], [data-testid~="${target.testId}"]`);
      } else if ('css' in target) {
        el = modalEl.querySelector(target.css);
      } else if ('button' in target) {
        el =
          Array.from(modalEl.querySelectorAll('button')).find((b) =>
            b.textContent?.toLowerCase().includes(target.button.toLowerCase()),
          ) ?? null;
      }
    } else {
      switch (target) {
        case 'header':
          el = modalEl.querySelector('header, div.border-b');
          break;
        case 'action': {
          const buttons = modalEl.querySelectorAll('button');
          el = buttons.length > 0 ? buttons[buttons.length - 1] : null;
          break;
        }
        case 'filters':
          el = modalEl.querySelector('input:not([type="hidden"]), select');
          break;
        case 'table':
          el = modalEl.querySelector('table');
          break;
      }
    }

    // NUNCA realizar búsqueda de escape fuera del modal
    return visible(el) ? (el as HTMLElement) : null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. VALIDACIÓN DE VISIBILIDAD POR VISTA / PANEL ACTIVO
  // ─────────────────────────────────────────────────────────────────────────────
  if (context?.viewTestId) {
    const viewSelector = `[data-testid="${context.viewTestId}"], [data-testid~="${context.viewTestId}"]`;
    const viewEl = document.querySelector(viewSelector) as HTMLElement | null;

    // Si la vista requerida no está montada o no es visible en pantalla
    if (!viewEl || !visible(viewEl)) {
      return null;
    }

    // Si el objetivo es el propio panel contenedor de la vista
    if (typeof target === 'object' && 'testId' in target && target.testId === context.viewTestId) {
      return viewEl;
    }

    let el: Element | null = null;
    if (typeof target === 'object') {
      if ('testId' in target) {
        const tid = target.testId;
        el = viewEl.querySelector(`[data-testid="${tid}"], [data-testid~="${tid}"]`);

        // Soporte de aliasing para etapas en el pipeline horizontal
        if (!el && tid === 'pipeline-stage-solicitud') {
          el =
            viewEl.querySelector('[data-testid="pipeline-stage-solicitud"]') ??
            viewEl.querySelector('[data-testid="pipeline-stage-aprobacion"]') ??
            document.querySelector('[data-testid="btn-nueva-solicitud"]');
        } else if (!el && tid === 'pipeline-stage-aprobacion') {
          el =
            viewEl.querySelector('[data-testid="pipeline-stage-aprobacion"]') ??
            viewEl.querySelector('[data-testid="pipeline-stage-solicitud"]');
        }
      } else if ('css' in target) {
        el = viewEl.querySelector(target.css);
      } else if ('button' in target) {
        el =
          Array.from(viewEl.querySelectorAll('button')).find((b) =>
            b.textContent?.toLowerCase().includes(target.button.toLowerCase()),
          ) ?? null;
      }
    } else {
      switch (target) {
        case 'header':
          el = headerRow(viewEl) ?? viewEl.querySelector('header');
          break;
        case 'action': {
          const buttons = viewEl.querySelectorAll('button');
          el = buttons.length > 0 ? buttons[buttons.length - 1] : null;
          break;
        }
        case 'filters':
          el = viewEl.querySelector('input:not([type="hidden"]), select');
          break;
        case 'table':
          el = viewEl.querySelector('table');
          break;
        case 'pagination':
          el = viewEl.querySelector('[aria-label="Paginación"]');
          break;
      }
    }

    return visible(el) ? (el as HTMLElement) : null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. RESOLUCIÓN GENERAL (Tours Macro o Vistas Generales)
  // ─────────────────────────────────────────────────────────────────────────────
  const main = getWorkArea();
  let el: Element | null = null;

  if (typeof target === 'object') {
    if ('testId' in target) {
      const tid = target.testId;
      el =
        main?.querySelector(`[data-testid="${tid}"], [data-testid~="${tid}"]`) ??
        document.body.querySelector(`[data-testid="${tid}"], [data-testid~="${tid}"]`);

      // Aliasing robusto para las etapas visuales del pipeline
      if (!el && tid === 'pipeline-stage-solicitud') {
        el =
          document.querySelector('[data-testid="pipeline-stage-solicitud"]') ??
          document.querySelector('[data-testid="pipeline-stage-aprobacion"]') ??
          document.querySelector('[data-testid="btn-nueva-solicitud"]');
      } else if (!el && tid === 'pipeline-stage-aprobacion') {
        el =
          document.querySelector('[data-testid="pipeline-stage-aprobacion"]') ??
          document.querySelector('[data-testid="pipeline-stage-solicitud"]');
      }
    } else if ('css' in target) {
      el =
        main?.querySelector(target.css) ??
        document.body.querySelector(target.css);
    } else if ('button' in target) {
      const searchRoot = main || document.body;
      el =
        Array.from(searchRoot.querySelectorAll('button')).find((b) =>
          b.textContent?.toLowerCase().includes(target.button.toLowerCase()),
        ) ??
        Array.from(document.body.querySelectorAll('button')).find((b) =>
          b.textContent?.toLowerCase().includes(target.button.toLowerCase()),
        ) ??
        null;
    }
    return visible(el) ? (el as HTMLElement) : null;
  }

  if (!main) return null;

  switch (target) {
    case 'header':
      el = headerRow(main) ?? document.body.querySelector('header');
      break;
    case 'action': {
      const buttons = headerRow(main)?.querySelectorAll('button');
      el = buttons && buttons.length > 0 ? buttons[buttons.length - 1] : null;
      break;
    }
    case 'filters': {
      const field = main.querySelector('input:not([type="hidden"]), select');
      el =
        field?.closest('div.bg-white, div.rounded-xl, div.rounded-lg, div.p-4') ??
        field?.parentElement ??
        null;
      break;
    }
    case 'table':
      el =
        main.querySelector('table')?.closest('div.rounded-xl, div.rounded-lg, div.overflow-x-auto') ??
        main.querySelector('table');
      break;
    case 'rowActions':
      el = main.querySelector('table tbody tr:first-child td:last-child');
      break;
    case 'pagination': {
      const table = main.querySelector('table')?.closest('div.rounded-xl, div.rounded-lg');
      el = table?.querySelector(':scope > div.border-t') ?? main.querySelector('[aria-label="Paginación"]');
      break;
    }
    case 'banner':
      el = main.querySelector('div.bg-blue-50, div.bg-amber-50, div.bg-indigo-50, [role="alert"]');
      break;
  }

  return visible(el) ? (el as HTMLElement) : null;
};
