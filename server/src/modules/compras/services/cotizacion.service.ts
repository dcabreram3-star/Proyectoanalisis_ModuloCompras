import { CotizacionRepository } from '../repositories/cotizacion.repository.js';
import {
  ICotizacion,
  ICreateCotizacionDTO,
  IUpdateCotizacionDTO,
  ICotizacionFilterParams,
  IProveedor,
  ISaveMatrizCotizacionesDTO,
  ESTADOS_COTIZACION,
} from '@erp/contracts';

/**
 * Servicio de Negocio para la gestión de Cotizaciones en el Módulo de Compras ERP.
 * Centraliza validaciones de reglas de negocio antes de interactuar con el repositorio.
 */
export class CotizacionService {
  /**
   * Obtiene la lista de cotizaciones aplicando filtros opcionales.
   */
  static async obtenerCotizaciones(filters: ICotizacionFilterParams = {}): Promise<ICotizacion[]> {
    return await CotizacionRepository.findAll(filters);
  }

  /**
   * Obtiene una cotización específica por su identificador único.
   */
  static async obtenerCotizacionPorId(id: number, includePdf: boolean = false): Promise<ICotizacion | null> {
    if (!id || id <= 0) {
      throw new Error('El ID de la cotización debe ser un entero positivo.');
    }
    return await CotizacionRepository.findById(id, includePdf);
  }

  /**
   * Obtiene el catálogo de proveedores activos desde la tabla PROVEEDOR.
   */
  static async obtenerProveedoresActivos(): Promise<IProveedor[]> {
    return await CotizacionRepository.findProveedoresActivos();
  }

  /**
   * Valida y crea una nueva cotización en la base de datos.
   */
  static async crearCotizacion(data: ICreateCotizacionDTO): Promise<ICotizacion> {
    if (!data.cotNoDocumentoSolicitud || data.cotNoDocumentoSolicitud.trim() === '') {
      throw new Error('El número de documento de la solicitud es obligatorio.');
    }

    if (!data.cotIdProveedor || data.cotIdProveedor <= 0) {
      throw new Error('El ID del proveedor es obligatorio y debe ser mayor a 0.');
    }

    if (data.cotPrecioTotal === undefined || data.cotPrecioTotal === null || data.cotPrecioTotal < 0) {
      throw new Error('El precio total de la cotización debe ser mayor o igual a 0.');
    }

    if (data.cotEsExcepcionUnico !== undefined && ![0, 1].includes(data.cotEsExcepcionUnico)) {
      throw new Error('El campo cotEsExcepcionUnico sólo admite los valores 0 o 1.');
    }

    if (data.cotEstadoAdjudicacion && !ESTADOS_COTIZACION.includes(data.cotEstadoAdjudicacion.toUpperCase() as any)) {
      throw new Error(`El estado de adjudicación es inválido. Valores permitidos: ${ESTADOS_COTIZACION.join(', ')}`);
    }

    return await CotizacionRepository.create({
      ...data,
      cotEsExcepcionUnico: data.cotEsExcepcionUnico ?? 0,
      cotEstadoAdjudicacion: (data.cotEstadoAdjudicacion || 'PENDIENTE').toUpperCase(),
    });
  }

  /**
   * Valida y actualiza una cotización existente.
   */
  static async actualizarCotizacion(id: number, data: IUpdateCotizacionDTO): Promise<ICotizacion> {
    if (!id || id <= 0) {
      throw new Error('El ID de la cotización debe ser un entero positivo.');
    }

    if (data.cotIdProveedor !== undefined && data.cotIdProveedor <= 0) {
      throw new Error('El ID del proveedor debe ser mayor a 0.');
    }

    if (data.cotPrecioTotal !== undefined && data.cotPrecioTotal < 0) {
      throw new Error('El precio total de la cotización debe ser mayor o igual a 0.');
    }

    if (data.cotEsExcepcionUnico !== undefined && ![0, 1].includes(data.cotEsExcepcionUnico)) {
      throw new Error('El campo cotEsExcepcionUnico sólo admite los valores 0 o 1.');
    }

    if (data.cotEstadoAdjudicacion && !ESTADOS_COTIZACION.includes(data.cotEstadoAdjudicacion.toUpperCase() as any)) {
      throw new Error(`El estado de adjudicación es inválido. Valores permitidos: ${ESTADOS_COTIZACION.join(', ')}`);
    }

    const updated = await CotizacionRepository.update(id, {
      ...data,
      cotEstadoAdjudicacion: data.cotEstadoAdjudicacion ? data.cotEstadoAdjudicacion.toUpperCase() : undefined,
    });

    if (!updated) {
      throw new Error(`No se encontró la cotización con ID ${id}.`);
    }

    return updated;
  }

  /**
   * Elimina de forma segura una cotización por ID.
   */
  static async eliminarCotizacion(id: number): Promise<boolean> {
    if (!id || isNaN(id) || id <= 0) {
      throw new Error('El ID de la cotización debe ser un entero positivo.');
    }

    await CotizacionRepository.delete(id);
    return true;
  }

  /**
   * Procesa atómicamente la matriz completa de cotizaciones (UPSERT y DELETE).
   */
  static async guardarMatriz(dto: ISaveMatrizCotizacionesDTO): Promise<ICotizacion[]> {
    if (!dto.noSolicitud || dto.noSolicitud.trim() === '') {
      throw new Error('El número de documento de la solicitud es obligatorio.');
    }

    if ((!dto.cotizaciones || dto.cotizaciones.length === 0) && (!dto.eliminarCotizacionIds || dto.eliminarCotizacionIds.length === 0)) {
      throw new Error('Debe proporcionar al menos una cotización para procesar.');
    }

    for (const item of (dto.cotizaciones || [])) {
      if (!item.idProveedor || item.idProveedor <= 0) {
        throw new Error('Cada cotización debe tener un proveedor válido.');
      }
      if (item.precioTotal === undefined || item.precioTotal === null || item.precioTotal < 0) {
        throw new Error('El precio total de cada cotización debe ser mayor o igual a 0.');
      }

      // Validación estricta de archivos adjuntos (COMP-008)
      if (item.archivoPdf && (Buffer.isBuffer(item.archivoPdf) || (typeof item.archivoPdf === 'string' && item.archivoPdf.length > 255))) {
        const { validatePdfBuffer } = await import('../utils/fileValidator.js');
        const rawStr = typeof item.archivoPdf === 'string' ? item.archivoPdf.replace(/^data:application\/pdf;base64,/, '') : '';
        const buf = Buffer.isBuffer(item.archivoPdf) ? item.archivoPdf : Buffer.from(rawStr, 'base64');
        const valResult = validatePdfBuffer(buf);
        if (!valResult.valid) {
          throw new Error(`Archivo PDF de cotización rechazado (Proveedor #${item.idProveedor}): ${valResult.error}`);
        }
      }
    }

    return await CotizacionRepository.saveMatriz(dto);
  }

  /**
   * Adjudica formalmente una cotización como oferta ganadora para una solicitud (COMP-004).
   * Valida estrictamente pertenencia a la solicitud y etapa válida del proceso.
   */
  static async adjudicarCotizacion(id: number, noSolicitud: string, justificacion?: string): Promise<ICotizacion> {
    if (!id || id <= 0) {
      throw new Error('El ID de la cotización a adjudicar debe ser un entero positivo.');
    }
    if (!noSolicitud || !noSolicitud.trim()) {
      throw new Error('El número de documento de la solicitud es obligatorio para la adjudicación.');
    }

    const cleanNoSol = noSolicitud.trim();

    // 1. Validar existencia de la cotización y verificar pertenencia a la solicitud (COMP-004)
    const cotizacion = await CotizacionRepository.findById(id);
    if (!cotizacion) {
      throw new Error(`La cotización #${id} no existe en el sistema.`);
    }

    if (cotizacion.cotNoDocumentoSolicitud.trim() !== cleanNoSol) {
      throw new Error(
        `La cotización #${id} pertenece a la solicitud '${cotizacion.cotNoDocumentoSolicitud}', no a '${cleanNoSol}'. Operación denegada.`
      );
    }

    // 2. Validar que la solicitud exista y se encuentre en etapa apta para adjudicación (COMP-004)
    const { SolicitudCompraRepository } = await import('../repositories/solicitudCompra.repository.js');
    const solicitud = await SolicitudCompraRepository.findByNoDocumento(cleanNoSol);
    if (!solicitud) {
      throw new Error(`La solicitud de compra '${cleanNoSol}' no existe en la base de datos.`);
    }

    const estadoUpper = (solicitud.solNombreEstado || '').toUpperCase();
    const notasUpper = (solicitud.solNotas || '').toUpperCase();

    if (
      estadoUpper.includes('RECHAZAD') ||
      estadoUpper.includes('DENEGAD') ||
      notasUpper.includes('[RECHAZADA]') ||
      solicitud.solIdEstado === 6
    ) {
      throw new Error(`No se puede adjudicar la cotización: la solicitud ${cleanNoSol} se encuentra RECHAZADA.`);
    }

    if (estadoUpper.includes('FINALIZADA') || estadoUpper.includes('CERRADA') || solicitud.solIdEstado === 5) {
      throw new Error(`No se puede adjudicar la cotización: la solicitud ${cleanNoSol} ya está FINALIZADA.`);
    }

    if (solicitud.tienePo || solicitud.solIdEstado === 4 || estadoUpper.includes('RECIBIDA')) {
      throw new Error(`No se puede adjudicar la cotización: la solicitud ${cleanNoSol} ya cuenta con una Orden de Compra emitida.`);
    }

    return await CotizacionRepository.adjudicar(id, cleanNoSol, justificacion);
  }
}
