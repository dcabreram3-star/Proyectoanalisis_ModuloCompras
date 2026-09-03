// Controlador del módulo de Recepciones de Bodega
import { Request, Response } from 'express';
import * as recepcionService from '../services/recepcion.service';

const mensajesError: Record<string, { status: number; mensaje: string }> = {
  NOT_FOUND: { status: 404, mensaje: 'Recepción no encontrada' },
  ORDEN_NO_ENCONTRADA: { status: 404, mensaje: 'La orden de compra indicada no existe' },
  VALIDATION_PO_REQUERIDA: { status: 400, mensaje: 'Debes indicar el número de Orden de Compra (noPo)' },
  VALIDATION_USUARIO_REQUERIDO: { status: 400, mensaje: 'Debes indicar el usuario de bodega' },
  VALIDATION_TIPO_REQUERIDO: { status: 400, mensaje: 'Debes indicar el tipo de recepción' },
  VALIDATION_DETALLE_VACIO: { status: 400, mensaje: 'La recepción debe tener al menos un artículo' },
  VALIDATION_CANTIDAD_INVALIDA: { status: 400, mensaje: 'La cantidad recibida debe ser mayor a cero' },
  VALIDATION_ARTICULO_NO_PERTENECE_A_LA_PO: {
    status: 400,
    mensaje: 'Uno de los artículos no pertenece a la Orden de Compra indicada',
  },
  VALIDATION_CANTIDAD_EXCEDE_LO_PENDIENTE: {
    status: 400,
    mensaje: 'La cantidad recibida de un artículo excede lo que aún está pendiente por recibir',
  },
};

function manejarError(error: any, res: Response) {
  const definido = mensajesError[error.message];
  if (definido) {
    return res.status(definido.status).json({ error: definido.mensaje });
  }
  console.error(error);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

export async function obtenerDetalleParaRecepcion(req: Request, res: Response) {
  try {
    const { noPo } = req.params;
    const orden = await recepcionService.obtenerOrdenParaRecepcion(noPo);
    res.json(orden);
  } catch (error) {
    manejarError(error, res);
  }
}

export async function listar(_req: Request, res: Response) {
  try {
    const recepciones = await recepcionService.listarRecepciones();
    res.json(recepciones);
  } catch (error) {
    manejarError(error, res);
  }
}

export async function obtener(req: Request, res: Response) {
  try {
    const { noRecepcion } = req.params;
    const recepcion = await recepcionService.obtenerRecepcion(noRecepcion);
    res.json(recepcion);
  } catch (error) {
    manejarError(error, res);
  }
}

export async function crear(req: Request, res: Response) {
  try {
    const nuevaRecepcion = await recepcionService.registrarRecepcion(req.body);
    res.status(201).json(nuevaRecepcion);
  } catch (error) {
    manejarError(error, res);
  }
}