/**
 * Gestión resiliente del progreso de tutoriales completados en localStorage.
 * Degradación silenciosa en entornos con cuota excedida o navegación privada.
 */
const getStorageKey = (modulo: string) => `erp.tutoriales.${modulo.toLowerCase()}.completados`;

export const getCompleted = (modulo: string): string[] => {
  try {
    const raw = window.localStorage.getItem(getStorageKey(modulo));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export const markCompleted = (modulo: string, tutorialId: string): void => {
  try {
    const current = getCompleted(modulo);
    const next = Array.from(new Set([...current, tutorialId]));
    window.localStorage.setItem(getStorageKey(modulo), JSON.stringify(next));
  } catch {
    /* Degrada sin interrumpir la experiencia de usuario */
  }
};

export const resetCompleted = (modulo: string): void => {
  try {
    window.localStorage.removeItem(getStorageKey(modulo));
  } catch {
    /* Sin persistencia disponible */
  }
};
