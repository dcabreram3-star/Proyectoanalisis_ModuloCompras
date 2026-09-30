import React from 'react';
import { X, ArrowDown } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface FlowStep {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
}

interface FlowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  pasos: FlowStep[];
}

// Un color distinto por etapa, en degradado: transmite avance (del inicio al final del proceso)
// y ayuda a diferenciar cada tarjeta de un vistazo, sin depender solo de leer el número.
const COLORES = [
  { grad: 'from-blue-500 to-blue-600', ring: 'ring-blue-100', borde: 'hover:border-blue-200' },
  { grad: 'from-indigo-500 to-indigo-600', ring: 'ring-indigo-100', borde: 'hover:border-indigo-200' },
  { grad: 'from-violet-500 to-violet-600', ring: 'ring-violet-100', borde: 'hover:border-violet-200' },
  { grad: 'from-fuchsia-500 to-fuchsia-600', ring: 'ring-fuchsia-100', borde: 'hover:border-fuchsia-200' },
  { grad: 'from-amber-500 to-amber-600', ring: 'ring-amber-100', borde: 'hover:border-amber-200' },
  { grad: 'from-teal-500 to-teal-600', ring: 'ring-teal-100', borde: 'hover:border-teal-200' },
  { grad: 'from-emerald-500 to-emerald-600', ring: 'ring-emerald-100', borde: 'hover:border-emerald-200' },
];

/**
 * Modal genérico "¿Cómo funciona esto?": lista de tarjetas horizontales (ícono grande a la
 * izquierda, texto a la derecha), tipo línea de tiempo, con letra grande y de buen contraste
 * para que sea legible también para personas mayores o con baja visión.
 * No depende de components/ui para poder usarse en cualquier módulo sin tocar esa carpeta.
 */
export const FlowGuideModal: React.FC<FlowGuideModalProps> = ({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  pasos,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[88vh] overflow-y-auto animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-guide-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="sticky top-0 bg-white p-6 pb-4 flex items-start justify-between border-b border-slate-100 z-10">
          <div>
            <h3 id="flow-guide-title" className="text-xl font-bold text-slate-900">
              {titulo}
            </h3>
            {subtitulo && (
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{subtitulo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Cerrar guía"
          >
            <X size={22} />
          </button>
        </div>

        {/* Pasos del flujo: tarjetas horizontales en línea de tiempo */}
        <div className="p-6 space-y-1">
          {pasos.map((paso, i) => {
            const Icono = paso.icon;
            const color = COLORES[i % COLORES.length];
            const esUltimo = i === pasos.length - 1;

            return (
              <React.Fragment key={i}>
                <div
                  className={`flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-colors ${color.borde}`}
                >
                  <div
                    className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${color.grad} text-white flex items-center justify-center ring-4 ${color.ring} shadow-sm`}
                  >
                    <Icono size={26} className="stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {paso.titulo}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                      {paso.descripcion}
                    </p>
                  </div>
                </div>

                {!esUltimo && (
                  <div className="flex justify-center py-0.5 text-slate-400">
                    <ArrowDown size={18} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Pie */}
        <div className="px-6 pb-6">
          <p className="text-xs text-slate-500 text-center">
            Cada etapa se ve reflejada en el sistema con su propio color y estado. Toca "Cerrar" para volver a tu trabajo.
          </p>
        </div>
      </div>
    </div>
  );
};