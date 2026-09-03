import { createContext, useCallback, useContext, useState } from 'react';

interface SolicitudConfirmacion {
  mensaje: string;
  resolver: (resultado: boolean) => void;
}

type ConfirmContextValue = (mensaje: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [solicitud, setSolicitud] = useState<SolicitudConfirmacion | null>(null);

  const confirmar = useCallback((mensaje: string): Promise<boolean> => {
    return new Promise((resolver) => {
      setSolicitud({ mensaje, resolver });
    });
  }, []);

  function responder(resultado: boolean) {
    solicitud?.resolver(resultado);
    setSolicitud(null);
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}

      {solicitud && (
        <div className="modal-overlay">
          <div className="modal-card">
            <p className="modal-title">Confirmar acción</p>
            <p className="modal-message">{solicitud.mensaje}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => responder(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={() => responder(true)}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm debe usarse dentro de un <ConfirmProvider>');
  }
  return context;
}