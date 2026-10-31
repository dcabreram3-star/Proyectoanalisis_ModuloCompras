import { z } from 'zod';

export interface IMovimientoInventarioDetalleCreateDTO {
  codigoArticulo: string;
  cantidad: number;
  costoUnitario?: number; // Para entradas puede ser necesario, o se asume costo promedio local
  idUbicacion?: number;
  idLote?: number;
}

export interface IMovimientoInventarioCreateDTO {
  tipoMovimiento: 'AJU_ENTRADA' | 'AJU_SALIDA' | 'TRF_SALIDA' | 'TRF_ENTRADA' | string;
  idBodegaOrigen: number;
  idBodegaDestino?: number; // Requerido si es TRF_SALIDA
  idUsuario: number;
  observaciones?: string;
  detalles: IMovimientoInventarioDetalleCreateDTO[];
}

export interface IMovimientoInventarioResponseDTO {
  success: boolean;
  message: string;
  noMovimiento: string;
  advertenciaConcurrencia?: string;
}

export const agregarExistenciasSchema = z.object({
  codigoArticulo: z.string().trim().min(1, 'Debe especificar un código de artículo válido.'),
  idBodega: z.coerce.number().int().positive('Debe seleccionar una bodega válida.'),
  cantidad: z.coerce
    .number({ message: 'La cantidad a añadir debe ser un número válido.' })
    .int({ message: 'La cantidad a añadir debe ser un número entero (sin decimales).' })
    .positive({ message: 'La cantidad a añadir debe ser un entero positivo mayor o igual a 1.' }),
  costoUnitario: z.coerce.number({ message: 'El costo unitario debe ser un valor numérico.' }).min(0, 'El costo unitario debe ser mayor o igual a 0.').optional().nullable(),
  idUbicacion: z.coerce.number().int().positive().optional().nullable(),
  idLote: z.coerce.number().int().positive().optional().nullable(),
  notas: z.string().trim().optional().nullable(),
  idUsuario: z.coerce.number().int().positive().optional().nullable(),
});

export type IAgregarExistenciasDTO = z.infer<typeof agregarExistenciasSchema>;

