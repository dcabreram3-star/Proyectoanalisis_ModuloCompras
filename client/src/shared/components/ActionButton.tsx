import React from 'react';
import { LucideIcon } from 'lucide-react';

export type ActionButtonVariant = 'edit' | 'delete' | 'activate' | 'deactivate';

interface ActionButtonProps {
  icon: LucideIcon;
  label: React.ReactNode;
  title?: string;
  onClick: () => void;
  variant: ActionButtonVariant;
  disabled?: boolean;
}

const ESTILOS: Record<ActionButtonVariant, string> = {
  edit: 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800',
  delete: 'bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800',
  activate: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800',
  deactivate: 'bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800',
};

/**
 * Botón de acción estandarizado (editar / eliminar / activar / desactivar) para las
 * tablas de catálogos. El color va siempre visible, no solo al pasar el mouse por encima,
 * y trae una palabra junto al ícono para que cualquier persona reconozca la acción sin
 * tener que adivinar qué significa la figura.
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  icon: Icon,
  label,
  title,
  onClick,
  variant,
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${ESTILOS[variant]}`}
  >
    <Icon size={16} className="shrink-0" />
    <span className="hidden sm:inline whitespace-nowrap">{label}</span>
  </button>
);