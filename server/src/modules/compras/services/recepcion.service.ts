// Lógica de negocio del módulo de Recepciones de Bodega
import * as recepcionRepository from '../repositories/recepcion.repository';
import {
  CrearRecepcionInput,
  OrdenParaRecepcion,
  RecepcionConDetalle,
} from '../types/recepcion.types';

const PORCENTAJE_IVA = 0.12; // 12%, mismo porcentaje usado en el resto del módulo

export async function obtenerOrdenParaRecepcion(noPo: string): Promise<OrdenParaRecepcion> {
  const existe = await recepcionRepository.existeOrdenCompra(noPo);
  if (!existe) {
    throw new Error('ORDEN_NO_ENCONTRADA');
  }

  const lineas = await recepcionRepository.findLineasPendientesPorPO(noPo);
  return { noPo, lineas };
}

export async function listarRecepciones() {
  return recepcionRepository.findAllRecepciones();
}

export async function obtenerRecepcion(noRecepcion: string): Promise<RecepcionConDetalle> {
  const encabezado = await recepcionRepository.findRecepcionPorId(noRecepcion);
  if (!encabezado) {
    throw new Error('NOT_FOUND');
  }

  const detalle = await recepcionRepository.findDetallePorRecepcion(noRecepcion);
  return { ...encabezado, detalle };
}

export async function registrarRecepcion(data: CrearRecepcionInput): Promise<RecepcionConDetalle> {
  // --- Validaciones básicas de forma ---
  if (!data.noPo) {
    throw new Error('VALIDATION_PO_REQUERIDA');
  }
  if (!data.idUsuarioBodega) {
    throw new Error('VALIDATION_USUARIO_REQUERIDO');
  }
  if (!data.tipoRecepcion) {
    throw new Error('VALIDATION_TIPO_REQUERIDO');
  }
  if (!data.detalle || data.detalle.length === 0) {
    throw new Error('VALIDATION_DETALLE_VACIO');
  }

  // --- Validación de negocio: la PO debe existir y las cantidades deben cuadrar ---
  const lineasPendientes = await recepcionRepository.findLineasPendientesPorPO(data.noPo);
  if (lineasPendientes.length === 0) {
    throw new Error('ORDEN_NO_ENCONTRADA');
  }

  let subtotal = 0;

  for (const lineaRecibida of data.detalle) {
    if (!lineaRecibida.cantidadRecibida || lineaRecibida.cantidadRecibida <= 0) {
      throw new Error('VALIDATION_CANTIDAD_INVALIDA');
    }

    const lineaPO = lineasPendientes.find(
      (l) => l.DOC_CODIGO_ARTICULO === lineaRecibida.codigoArticulo
    );

    if (!lineaPO) {
      throw new Error('VALIDATION_ARTICULO_NO_PERTENECE_A_LA_PO');
    }

    if (lineaRecibida.cantidadRecibida > lineaPO.CANTIDAD_PENDIENTE) {
      throw new Error('VALIDATION_CANTIDAD_EXCEDE_LO_PENDIENTE');
    }

    subtotal += lineaRecibida.cantidadRecibida * lineaPO.DOC_PRECIO_UNITARIO;
  }

  const iva = Number((subtotal * PORCENTAJE_IVA).toFixed(2));
  const total = Number((subtotal + iva).toFixed(2));

  const noRecepcion = await recepcionRepository.crearRecepcion(data, {
    subtotal: Number(subtotal.toFixed(2)),
    iva,
    total,
  });

  return obtenerRecepcion(noRecepcion);
}