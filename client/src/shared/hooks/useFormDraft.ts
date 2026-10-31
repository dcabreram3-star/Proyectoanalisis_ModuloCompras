import { useEffect, useRef, useCallback } from 'react';

/**
 * Utilidades para almacenamiento seguro de borradores temporales en localStorage.
 * Soporta serialización JSON, manejo de excepciones de cuota y parseo seguro.
 */
export const draftStorage = {
  get: <T>(key: string, defaultValue?: T): T | undefined => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn(`[draftStorage] Error al leer borrador para ${key}:`, e);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[draftStorage] Error al guardar borrador para ${key}:`, e);
    }
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[draftStorage] Error al eliminar borrador para ${key}:`, e);
    }
  },
};

export interface UseFormDraftOptions<T> {
  key: string;
  data: T;
  enabled?: boolean;
  debounceMs?: number;
  onRestore?: (savedData: T) => void;
  shouldSave?: (data: T) => boolean;
}

/**
 * Hook para autoguardado y restauración automática de borradores de formularios ante recarga de página (F5).
 */
export function useFormDraft<T>({
  key,
  data,
  enabled = true,
  debounceMs = 400,
  onRestore,
  shouldSave,
}: UseFormDraftOptions<T>) {
  const isInitializedRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Restaurar borrador en el montaje inicial
  useEffect(() => {
    if (!key || !enabled) return;

    try {
      const saved = draftStorage.get<T>(key);
      if (saved !== undefined && saved !== null) {
        if (onRestore) {
          onRestore(saved);
        }
      }
    } catch (err) {
      console.warn(`[useFormDraft] Error al restaurar borrador para ${key}:`, err);
    } finally {
      // Marcar inicializado tras el ciclo inicial
      const timer = setTimeout(() => {
        isInitializedRef.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [key, enabled]);

  // Autoguardado con debounce ante cambios de estado
  useEffect(() => {
    if (!key || !enabled || !isInitializedRef.current) return;

    if (shouldSave && !shouldSave(data)) {
      return;
    }

    const timer = setTimeout(() => {
      draftStorage.set(key, dataRef.current);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [key, data, enabled, debounceMs, shouldSave]);

  const clearDraft = useCallback(() => {
    draftStorage.remove(key);
  }, [key]);

  const saveImmediately = useCallback(() => {
    draftStorage.set(key, dataRef.current);
  }, [key]);

  return { clearDraft, saveImmediately };
}
