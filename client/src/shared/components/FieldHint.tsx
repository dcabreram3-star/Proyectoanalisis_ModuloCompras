import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

const ANCHO = 256;

interface HintIconProps {
  text: React.ReactNode;
  size?: number;
}

/** Ícono "?" con tooltip (hover, foco y tap). Úselo suelto donde ya tenga su propio label. */
export const HintIcon: React.FC<HintIconProps> = ({ text, size = 13 }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipId = useId();

  const abrir = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.right - ANCHO, window.innerWidth - ANCHO - 8));
    const abrirArriba = window.innerHeight - r.bottom < 150;
    setPos(abrirArriba ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const cerrar = () => setOpen(false);
    const onPointerDown = (e: PointerEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) cerrar();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Ayuda sobre este campo"
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={abrir}
        onMouseLeave={() => setOpen(false)}
        onFocus={abrir}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          open ? setOpen(false) : abrir();
        }}
        className="text-slate-400 hover:text-blue-600 focus:text-blue-600 focus:outline-none transition-colors cursor-help"
      >
        <HelpCircle size={size} />
      </button>

      {open &&
        createPortal(
          <div
            id={tipId}
            role="tooltip"
            style={{ position: 'fixed', width: ANCHO, ...pos }}
            className="z-[100] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-700 shadow-lg pointer-events-none"
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
};

interface FieldHintProps {
  text: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Ancho inicial de la caja, en caracteres esperados (ej. 15 para un NIT). Sin esto, la caja ocupa todo el ancho. */
  chars?: number;
  /** Ancho máximo al que puede crecer la caja mientras el usuario escribe, en caracteres. */
  max?: number;
}

/**
 * Envuelve un campo (TextInput, Select, TextArea o un bloque label+input) y le agrega el "?".
 * Con `chars` (y opcional `max`) la caja se ajusta al tamaño del dato esperado y crece
 * un poco conforme el usuario escribe, sin pasarse del ancho disponible.
 */
export const FieldHint: React.FC<FieldHintProps> = ({ text, children, className = '', chars, max }) => {
  const ref = useRef<HTMLDivElement>(null);

  const ajustar = () => {
    const caja = ref.current;
    if (!caja || !chars) return;
    const campo = caja.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="date"]), textarea'
    );
    const largo = campo?.value?.length ?? 0;
    const n = Math.min(Math.max(chars, largo + 2), max ?? chars * 2);
    caja.style.setProperty('--fit-n', String(n));
  };

  // Se recalcula en cada render (cada tecla actualiza el estado del formulario) y al cargar datos a editar.
  useLayoutEffect(ajustar);

  return (
    <div ref={ref} onInput={ajustar} className={`relative ${chars ? 'fit-field' : ''} ${className}`}>
      {children}
      <span className="absolute top-0 right-0 h-4 flex items-center">
        <HintIcon text={text} />
      </span>
    </div>
  );
};
