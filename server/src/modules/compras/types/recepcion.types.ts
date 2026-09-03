// Tipos usados internamente por el módulo de Recepciones de Bodega

// Una línea de la Orden de Compra, ya calculando cuánto falta por recibir
// (soporta entregas parciales: puede haber más de una recepción por PO)
export interface LineaPendienteRecepcion {
  DOC_CODIGO_ARTICULO: string;
  ART_DESCRIPCION: string;
  DOC_CANTIDAD_PEDIDA: number;
  DOC_PRECIO_UNITARIO: number;
  CANTIDAD_YA_RECIBIDA: number;
  CANTIDAD_PENDIENTE: number;
}

export interface OrdenParaRecepcion {
  noPo: string;
  lineas: LineaPendienteRecepcion[];
}

// Encabezado de una recepción ya registrada
export interface RecepcionBodega {
  RBO_NO_RECEPCION: string;
  RBO_NO_PO: string;
  RBO_ID_USUARIO_BODEGA: number;
  RBO_FECHA_RECEPCION: Date;
  RBO_TIPO_RECEPCION: string;
  RBO_SUBTOTAL_RECIBIDO: number;
  RBO_IVA_RECIBIDO: number;
  RBO_TOTAL_FACTURAR: number;
}

export interface DetalleRecepcion {
  DRE_ID_DETALLE_RECEPCION: number;
  DRE_NO_RECEPCION: string;
  DRE_CODIGO_ARTICULO: string;
  ART_DESCRIPCION?: string;
  DRE_CANTIDAD_RECIBIDA: number;
  DRE_VERIFICADO_FISICAMENTE: number; // 0 o 1
}

export interface RecepcionConDetalle extends RecepcionBodega {
  detalle: DetalleRecepcion[];
}

// Forma en la que llega el body del POST para crear una recepción
export interface CrearRecepcionInput {
  noPo: string;
  idUsuarioBodega: number;
  tipoRecepcion: string; // "Total" | "Parcial"
  detalle: Array<{
    codigoArticulo: string;
    cantidadRecibida: number;
    verificadoFisicamente: boolean;
  }>;
}