import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { FlowGuideModal, FlowStep } from './FlowGuideModal';

interface FloatingHelpButtonProps {
  titulo: string;
  subtitulo?: string;
  pasos: FlowStep[];
}

/**
 * Botón flotante fijo (esquina inferior derecha) que abre la guía del flujo del módulo.
 * Se coloca una vez por vista de módulo (Compras, Inventario); no depende de AppLayout.
 */
export const FloatingHelpButton: React.FC<FloatingHelpButtonProps> = ({ titulo, subtitulo, pasos }) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-3.5 pr-4 h-11 rounded-full bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors"
        aria-label="¿Cómo funciona este módulo?"
      >
        <HelpCircle size={20} />
        <span className="hidden sm:inline">¿Cómo funciona?</span>
      </button>

      <FlowGuideModal
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        titulo={titulo}
        subtitulo={subtitulo}
        pasos={pasos}
      />
    </>
  );
};