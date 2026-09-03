import { createContext, useCallback, useContext, useState } from 'react';

type TipoToast = 'success' | 'error';

interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

interface ToastContextValue {
  mostrarToast: (tipo: TipoToast, mensaje: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let contadorId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrarToast = useCallback((tipo: TipoToast, mensaje: string) => {
    const id = ++contadorId;
    setToasts((actuales) => [...actuales, { id, tipo, mensaje }]);

    // Se elimina solo después de unos segundos
    setTimeout(() => {
      setToasts((actuales) => actuales.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  function cerrarToast(id: number) {
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span className={`toast-icon ${toast.tipo}`}>
              {toast.tipo === 'success' ? '✓' : '✕'}
            </span>
            <span className="toast-message">{toast.mensaje}</span>
            <button className="toast-close" onClick={() => cerrarToast(toast.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de un <ToastProvider>');
  }
  return context.mostrarToast;
}