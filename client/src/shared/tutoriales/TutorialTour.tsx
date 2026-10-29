import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import type { Tutorial } from './tutorialTypes';
import { resolveTarget } from './resolveTarget';

export interface TutorialTourProps {
  tutorial: Tutorial;
  onClose: (completed: boolean) => void;
}

const POPOVER_WIDTH = 370;
const GAP = 14;
const PAD = 8;
const MARGIN = 14;
const RETRY_MS = 120;
const MAX_RETRIES = 25;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const TutorialTour: React.FC<TutorialTourProps> = ({ tutorial, onClose }) => {
  const { steps } = tutorial;
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [popoverHeight, setPopoverHeight] = useState(210);
  const popoverRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const step = steps[index] || steps[0];
  const isLast = index === steps.length - 1;

  const measure = useCallback(() => {
    const el = targetRef.current;
    if (!el || !el.isConnected) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      setBox(null);
      return;
    }
    setBox({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, []);

  // 1. Localiza el elemento del paso con polling y validación de ámbito (modal / vista)
  useEffect(() => {
    targetRef.current = null;
    setBox(null);
    if (!step?.target) return;

    let attempts = 0;
    let timer: number | undefined;
    let cancelled = false;

    const find = () => {
      if (cancelled) return;
      const el = resolveTarget(step.target, {
        modalTestId: tutorial.modalTestId,
        modalSelector: tutorial.modalSelector,
        viewTestId: tutorial.viewTestId,
      });

      if (el) {
        targetRef.current = el;
        el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        measure();
        window.setTimeout(measure, 80);
        window.setTimeout(measure, 200);
        window.setTimeout(measure, 350);
      } else if (attempts++ < MAX_RETRIES) {
        timer = window.setTimeout(find, RETRY_MS);
      } else {
        // Si el tutorial requiere un modal o vista específica y no está en pantalla,
        // cancelar limpiamente en lugar de mostrar un popover huérfano en el fondo.
        if (tutorial.modalTestId || tutorial.viewTestId) {
          console.warn(`[TutorialTour]: Ámbito requerido no disponible para '${tutorial.id}'. Cerrando tour para evitar desalineación.`);
          onClose(false);
        }
      }
    };
    find();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [step, measure, tutorial, onClose]);

  // 2. Monitor de ciclo de vida del modal/vista: si se cierra o desmonta, abortar el tour
  useEffect(() => {
    if (!tutorial.modalTestId && !tutorial.viewTestId) return;

    const interval = window.setInterval(() => {
      if (tutorial.modalTestId) {
        const modal = document.querySelector(`[data-testid="${tutorial.modalTestId}"]`);
        if (!modal || modal.getBoundingClientRect().width === 0) {
          onClose(false);
        }
      } else if (tutorial.viewTestId) {
        const view = document.querySelector(`[data-testid="${tutorial.viewTestId}"]`);
        if (!view || view.getBoundingClientRect().width === 0) {
          onClose(false);
        }
      }
    }, 300);

    return () => window.clearInterval(interval);
  }, [tutorial.modalTestId, tutorial.viewTestId, onClose]);

  // 3. Actualizar coordenadas en redimensionamiento o scroll
  useEffect(() => {
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  useLayoutEffect(() => {
    if (popoverRef.current) setPopoverHeight(popoverRef.current.offsetHeight);
  }, [index, box]);

  const goNext = useCallback(() => {
    if (isLast) onClose(true);
    else setIndex((i) => i + 1);
  }, [isLast, onClose]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    nextRef.current?.focus();
  }, [index, box]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose(false);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [goNext, goPrev, onClose]);

  // Si el paso tiene un target definido pero aún no se ha medido el elemento (ej. modal abriéndose),
  // se espera en silencio para evitar posicionar el popover centrado sobre el fondo de la pantalla.
  const isWaitingForTarget = Boolean(step?.target && !box);

  // Posicionamiento del popover
  const popoverStyle = (() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(POPOVER_WIDTH, vw - MARGIN * 2);
    if (!box) {
      return { width, top: Math.max(MARGIN, (vh - popoverHeight) / 2), left: (vw - width) / 2 };
    }
    const below = box.top + box.height + GAP;
    const fitsBelow = below + popoverHeight + MARGIN <= vh;
    const top = fitsBelow ? below : Math.max(MARGIN, box.top - GAP - popoverHeight);
    const left = Math.min(Math.max(MARGIN, box.left), vw - width - MARGIN);
    return { width, top, left };
  })();

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      {/* Capa de captura */}
      <div className="absolute inset-0" aria-hidden="true" />

      {box ? (
        <div
          className="absolute rounded-xl ring-2 ring-blue-500 pointer-events-none transition-all duration-200"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
          }}
          aria-hidden="true"
        />
      ) : !step?.target ? (
        <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[1px]" aria-hidden="true" />
      ) : null}

      {!isWaitingForTarget && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-step-title"
          aria-describedby="tutorial-step-body"
          className="absolute bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 transition-all duration-150 animate-in fade-in zoom-in-95"
          style={popoverStyle}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600 animate-pulse" aria-hidden="true" />
              <p className="text-[11px] uppercase tracking-wider font-bold text-blue-600">
                {tutorial.title} · Paso {index + 1} de {steps.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onClose(false)}
              className="p-1 -mt-1 -mr-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              aria-label="Cerrar tutorial"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <h3 id="tutorial-step-title" className="mt-2 text-base font-bold text-slate-900">
            {step.title}
          </h3>
          <p id="tutorial-step-body" className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {step.body}
          </p>

          {/* Indicadores de progreso */}
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === index ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Botones de acción del tour */}
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1 py-0.5 cursor-pointer"
            >
              Omitir tour
            </button>
            <div className="flex gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="h-8 px-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Anterior
                </button>
              )}
              <button
                ref={nextRef}
                type="button"
                onClick={goNext}
                className="h-8 px-3.5 inline-flex items-center gap-1 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                {isLast ? 'Finalizar' : 'Siguiente'}
                {!isLast && <ChevronRight size={14} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
