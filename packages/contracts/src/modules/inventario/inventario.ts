// packages/contracts/src/modules/inventario/inventario.ts

export interface IArticulo {
  ART_CODIGO_ARTICULO: string;
  ART_DESCRIPCION: string;
  ART_ID_CATEGORIA: number;
  ART_ID_MARCA: number;
  ART_ID_UNIDAD_COMPRA: number;
  ART_ID_UNIDAD_VENTA: number;
  ART_MANEJA_LOTE: number; // 0 o 1
  ART_ACTIVO: number;      // 0 o 1
  STOCK_TOTAL?: number;
}

export interface IActualizarArticuloDTO {
  ART_DESCRIPCION: string;
}

export interface ICrearArticuloDTO {
  ART_CODIGO_ARTICULO: string;
  ART_DESCRIPCION: string;
  ART_ID_CATEGORIA: number;
  ART_ID_MARCA: number;
  ART_ID_UNIDAD_COMPRA: number;
  ART_ID_UNIDAD_VENTA: number;
  ART_MANEJA_LOTE: number;
}

export interface IArticuloFiltros {
  soloActivos?: boolean;
  activo?: number;
  search?: string;
  categoriaId?: number;
  marcaId?: number;
  page?: number;
  limit?: number;
}

export interface IArticulosPaginadosResponse {
  data: IArticulo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
