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

export interface IAgregarExistenciasDTO {
  codigoArticulo: string;
  idBodega: number;
  cantidad: number;
  costoUnitario?: number;
  idUbicacion?: number;
  idLote?: number;
  notas?: string;
  idUsuario?: number;
}
