import { SolicitudCompraRepository } from '../repositories/solicitudCompra.repository.js';
import {
  ISolicitudCompra,
  ISolicitudCompraFilterParams,
  ISolicitudCompraDetalle,
  ISolicitudCompraCompleta,
  IUpdateSolicitudCompraDTO,
  IAprobarSolicitudDTO,
  IRechazarSolicitudDTO,
  IEmpleadoResponsableOption,
  IDepartamentoOption,
} from '@erp/contracts';

import { ComprasMailerService } from './comprasMailer.service.js';

export class SolicitudCompraService {
  static async obtenerSolicitudes(filters: ISolicitudCompraFilterParams = {}): Promise<ISolicitudCompra[]> {
    return await SolicitudCompraRepository.findAll(filters);
  }

  static async obtenerSolicitudPorNoDocumento(noDocumento: string): Promise<ISolicitudCompra | null> {
    if (!noDocumento || noDocumento.trim() === '') {
      throw new Error('El número de documento es obligatorio.');
    }
    return await SolicitudCompraRepository.findByNoDocumento(noDocumento);
  }

  static async obtenerSolicitudCompleta(noDocumento: string): Promise<ISolicitudCompraCompleta | null> {
    if (!noDocumento || noDocumento.trim() === '') {
      throw new Error('El número de documento es obligatorio.');
    }
    return await SolicitudCompraRepository.findByNoDocumentoCompleto(noDocumento.trim());
  }

  static async obtenerDetalles(noDocumento: string): Promise<ISolicitudCompraDetalle[]> {
    if (!noDocumento || noDocumento.trim() === '') {
      throw new Error('El número de documento es obligatorio.');
    }
    return await SolicitudCompraRepository.findDetallesByNoDocumento(noDocumento.trim());
  }

  static async actualizarSolicitud(
    noDocumento: string,
    data: IUpdateSolicitudCompraDTO
  ): Promise<ISolicitudCompraCompleta> {
    const existing = await this.obtenerSolicitudPorNoDocumento(noDocumento);
    if (!existing) {
      throw new Error(`La solicitud de compra ${noDocumento} no existe.`);
    }

    if (data.detalles && data.detalles.length > 0) {
      for (const det of data.detalles) {
        const cantAprob = Number(det.cantidadAprobada);
        if (!Number.isInteger(cantAprob) || cantAprob < 0) {
          throw new Error(`La cantidad aprobada debe ser un número entero mayor o igual a 0 (Detalle #${det.idDetalle}).`);
        }
        det.cantidadAprobada = cantAprob;

        if (det.cantidadPedida !== undefined && det.cantidadPedida !== null) {
          const cantPed = Number(det.cantidadPedida);
          if (!Number.isInteger(cantPed) || cantPed < 1) {
            throw new Error(`La cantidad pedida debe ser un número entero mayor o igual a 1 (Detalle #${det.idDetalle}).`);
          }
          det.cantidadPedida = cantPed;
        }
      }
    }

    return await SolicitudCompraRepository.update(noDocumento.trim(), data);
  }

  static async aprobarSolicitud(
    noDocumento: string,
    dto: IAprobarSolicitudDTO
  ): Promise<ISolicitudCompraCompleta> {
    const existing = await this.obtenerSolicitudPorNoDocumento(noDocumento);
    if (!existing) {
      throw new Error(`La solicitud de compra ${noDocumento} no existe.`);
    }

    // 1. Validación de Estado de Origen (COMP-003)
    const estadoUpper = (existing.solNombreEstado || '').toUpperCase();
    const notasUpper = (existing.solNotas || '').toUpperCase();
    if (
      estadoUpper.includes('RECHAZAD') ||
      estadoUpper.includes('DENEGAD') ||
      notasUpper.includes('[RECHAZADA]') ||
      existing.solIdEstado === 6
    ) {
      throw new Error(`No se puede aprobar la solicitud ${noDocumento} porque se encuentra formalmente RECHAZADA.`);
    }
    if (
      estadoUpper.includes('FINALIZADA') ||
      estadoUpper.includes('CERRADA') ||
      existing.solIdEstado === 5
    ) {
      throw new Error(`No se puede aprobar la solicitud ${noDocumento} porque se encuentra FINALIZADA.`);
    }
    if (existing.tienePo || existing.solIdEstado === 4 || estadoUpper.includes('RECIBIDA')) {
      throw new Error(`No se puede aprobar la solicitud ${noDocumento} porque ya cuenta con Orden de Compra emitida.`);
    }
    if (
      estadoUpper === 'APROBADA' ||
      estadoUpper.startsWith('APROBAD') ||
      existing.solIdEstado === 2
    ) {
      throw new Error(`La solicitud ${noDocumento} ya fue aprobada y se encuentra en etapa de cotización.`);
    }

    // 2. Validación de Existencia y Pertenencia de Detalles (COMP-006)
    const detalles = await this.obtenerDetalles(noDocumento);
    if (detalles.length === 0) {
      throw new Error(`La solicitud ${noDocumento} no contiene artículos para aprobar.`);
    }

    const mapDetalles = new Map<number, ISolicitudCompraDetalle>();
    for (const d of detalles) {
      mapDetalles.set(d.dsoIdDetalleSolicitud, d);
    }

    if (dto.detalles && dto.detalles.length > 0) {
      for (const d of dto.detalles) {
        const matching = mapDetalles.get(d.idDetalle);
        if (!matching) {
          throw new Error(
            `El detalle #${d.idDetalle} no pertenece a la solicitud ${noDocumento}. Validación de integridad fallida.`
          );
        }

        const cant = Number(d.cantidadAprobada);
        if (!Number.isInteger(cant) || cant < 0) {
          throw new Error(`La cantidad aprobada (${d.cantidadAprobada}) debe ser un número entero mayor o igual a 0.`);
        }

        // Validación estricta: cantidad aprobada NO debe superar a la solicitada
        if (cant > matching.dsoCantidadPedida) {
          throw new Error(
            `La cantidad aprobada (${cant}) no puede superar a la cantidad solicitada (${matching.dsoCantidadPedida}) para el detalle #${d.idDetalle} (${matching.dsoCodigoArticulo}).`
          );
        }

        d.cantidadAprobada = cant;
      }

      const algunAprobado = dto.detalles.some((d) => d.cantidadAprobada > 0);
      if (!algunAprobado) {
        throw new Error('Debe aprobar al menos 1 unidad entera en algún artículo de la solicitud.');
      }
    }

    return await SolicitudCompraRepository.aprobar(noDocumento.trim(), dto);
  }

  static async rechazarSolicitud(
    noDocumento: string,
    dto: IRechazarSolicitudDTO
  ): Promise<ISolicitudCompraCompleta> {
    if (!noDocumento || noDocumento.trim() === '') {
      throw new Error('El número de documento de solicitud es requerido.');
    }

    if (!dto.motivoRechazo || dto.motivoRechazo.trim().length < 10) {
      throw new Error('El motivo de rechazo debe contener al menos 10 caracteres explicativos para fines de auditoría.');
    }

    const existing = await this.obtenerSolicitudPorNoDocumento(noDocumento);
    if (!existing) {
      throw new Error(`La solicitud de compra ${noDocumento} no existe.`);
    }

    const estadoUpper = (existing.solNombreEstado || '').toUpperCase();
    if (
      estadoUpper.includes('RECHAZAD') ||
      estadoUpper.includes('DENEGAD') ||
      existing.solIdEstado === 6
    ) {
      throw new Error(`La solicitud ${noDocumento} ya se encuentra formalmente RECHAZADA.`);
    }
    if (estadoUpper.includes('FINALIZADA') || existing.solIdEstado === 5) {
      throw new Error(`No se puede rechazar la solicitud ${noDocumento} porque ya fue FINALIZADA.`);
    }

    const rechazada = await SolicitudCompraRepository.rechazar(noDocumento.trim(), dto);

    // Notificación por correo con reintentos automáticos (COMP-009)
    ComprasMailerService.notificarRechazoSolicitud({
      noDocumento: noDocumento.trim(),
      motivoRechazo: dto.motivoRechazo.trim(),
      nombreSolicitante: existing.solNombreResponsable || undefined,
    }).catch((err) => {
      console.warn(`[SolicitudCompraService] Advertencia al notificar rechazo de solicitud ${noDocumento}:`, err.message);
    });

    return rechazada;
  }

  static async crearSolicitud(data: import('@erp/contracts').ISolicitudCompraCreateDTO): Promise<ISolicitudCompra> {
    if (!data.detalles || data.detalles.length === 0) {
      throw new Error('La solicitud debe tener al menos un detalle.');
    }

    for (let i = 0; i < data.detalles.length; i++) {
      const d = data.detalles[i];
      const cant = Number(d.cantidadPedida);
      if (!Number.isInteger(cant) || cant < 1) {
        throw new Error(`Línea #${i + 1}: La cantidad requerida (${d.cantidadPedida}) debe ser un número entero mayor o igual a 1.`);
      }
      d.cantidadPedida = cant;
    }

    // Folio atómico generado dentro de la transacción de base de datos
    const noDocumento = await SolicitudCompraRepository.create(data);

    // Recuperar la solicitud recién creada para devolverla completa
    const solicitudCreada = await this.obtenerSolicitudPorNoDocumento(noDocumento);
    if (!solicitudCreada) {
      throw new Error('Error al recuperar la solicitud creada de la base de datos.');
    }
    
    return solicitudCreada;
  }

  static async obtenerEmpleados(): Promise<IEmpleadoResponsableOption[]> {
    return await SolicitudCompraRepository.getEmpleados();
  }

  static async obtenerDepartamentos(): Promise<IDepartamentoOption[]> {
    return await SolicitudCompraRepository.getDepartamentos();
  }
}

