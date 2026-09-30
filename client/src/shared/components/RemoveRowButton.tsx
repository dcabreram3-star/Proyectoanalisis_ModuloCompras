import React from 'react';
import { Trash2 } from 'lucide-react';

interface RemoveRowButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

/**
 * Botón "quitar renglón" estandarizado para tablas donde se arma una lista (Solicitud de
 * Compra, Movimiento de Inventario, etc.). Mismo color e ícono siempre, en todos lados,
 * visible de una vez y no solo al pasar el mouse — igual principio que ActionButton, pero
 * pensado para una celda angosta (sin texto al lado, solo el ícono).
 */
export const RemoveRowButton: React.FC<RemoveRowButtonProps> = ({
  onClick,
  disabled = false,
  title = 'Quitar renglón',
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-transparent transition-colors"
  >
    <Trash2 size={16} />
  </button>
);