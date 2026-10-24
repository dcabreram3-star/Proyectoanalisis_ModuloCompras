export interface ITomaFisicaCreateDTO {
  idBodega: number;
  idUsuario: number;
}

export interface IDetalleConteoDTO {
  codigoArticulo: string;
  stockFisico: number;
}

export interface IGuardarConteoDTO {
  idToma: number;
  idUsuario: number;
  detalles: IDetalleConteoDTO[];
}

export interface IMovimientoConcurrenteDTO {
  idMovimiento: number;
  numeroMovimiento: string;
  fechaMovimiento?: string;
  tipoMovimiento: string;
  codigoArticulo: string;
  cantidad: number;
}

export interface IGuardarConteoResponseDTO {
  success: boolean;
  message: string;
  movimientosConcurrentes?: IMovimientoConcurrenteDTO[];
  advertenciaConcurrencia?: string;
}

export interface IDetalleTomaResponseDTO {
  idDetalle: number;
  codigoArticulo: string;
  nombreArticulo?: string;
  stockTeorico: number;
  stockFisico: number | null;
  diferencia: number | null;
}

export interface ITomaFisicaResponseDTO {
  idToma: number;
  numeroToma: string;
  idBodega: number;
  estado: string;
  detalles: IDetalleTomaResponseDTO[];
}
