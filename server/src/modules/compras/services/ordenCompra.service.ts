import { OrdenCompraRepository } from '../repositories/ordenCompra.repository.js';
import {
  IOrdenCompra,
  IOrdenCompraCompleta,
  IAutorizarPresupuestoDTO,
  IRechazarPresupuestoDTO,
  IOrdenCompraFilterParams,
} from '@erp/contracts';

import { generateOrdenCompraPdf } from '../../../utils/pdfGenerator.js';
import { ComprasMailerService } from './comprasMailer.service.js';

export class OrdenCompraService {
  static async obtenerOrdenesCompra(filters: IOrdenCompraFilterParams = {}): Promise<IOrdenCompra[]> {
    return await OrdenCompraRepository.findAll(filters);
  }

  static async obtenerPorNoPo(noPo: string): Promise<IOrdenCompraCompleta | null> {
    if (!noPo || noPo.trim() === '') {
      throw new Error('El número de orden de compra (PO) es obligatorio.');
    }
    return await OrdenCompraRepository.findByNoPo(noPo.trim());
  }

  static async obtenerPorSolicitud(noDocumento: string): Promise<IOrdenCompraCompleta | null> {
    if (!noDocumento || noDocumento.trim() === '') {
      throw new Error('El número de documento de solicitud es obligatorio.');
    }
    return await OrdenCompraRepository.findBySolicitud(noDocumento.trim());
  }

  static async autorizarPresupuesto(dto: IAutorizarPresupuestoDTO): Promise<IOrdenCompraCompleta> {
    if (!dto.noDocumento || dto.noDocumento.trim() === '') {
      throw new Error('El número de solicitud es requerido para autorizar el presupuesto.');
    }
    if (!dto.idCotizacionGanadora) {
      throw new Error('Se requiere el ID de la cotización adjudicada/ganadora.');
    }

    const orden = await OrdenCompraRepository.autorizarPresupuesto(dto);

    // Generación y almacenamiento automatizado del PDF oficial (COMP-013)
    try {
      const pdfBuffer = generateOrdenCompraPdf(orden);
      await OrdenCompraRepository.guardarPdfBlob(orden.ocoNoPo, pdfBuffer);

      // Despacho automatizado del correo al proveedor de forma asíncrona
      const emailProv = (orden as any).proEmail || 'proveedor@empresa.com';
      const nombreProv = orden.proNombreEntidad || `Proveedor #${orden.ocoIdCotizacionGanadora}`;

      ComprasMailerService.enviarOrdenCompraProveedor({
        noPo: orden.ocoNoPo,
        emailProveedor: emailProv,
        nombreProveedor: nombreProv,
        total: orden.ocoTotal,
        pdfBuffer,
      }).catch((err) => {
        console.warn(`[OrdenCompraService] Advertencia en envío diferido de PO ${orden.ocoNoPo} al proveedor:`, err.message);
      });
    } catch (errPdf: any) {
      console.warn(`[OrdenCompraService] Error al generar o archivar PDF de PO ${orden.ocoNoPo}:`, errPdf.message);
    }

    return orden;
  }

  static async rechazarPresupuesto(dto: IRechazarPresupuestoDTO): Promise<boolean> {
    if (!dto.noDocumento || dto.noDocumento.trim() === '') {
      throw new Error('El número de solicitud es requerido para registrar el rechazo de presupuesto.');
    }
    if (!dto.motivoRechazo || dto.motivoRechazo.trim().length < 10) {
      throw new Error('Debe especificar un motivo o justificación de al menos 10 caracteres para el rechazo presupuestario.');
    }

    const res = await OrdenCompraRepository.rechazarPresupuesto(dto);

    // Notificar rechazo de presupuesto
    ComprasMailerService.notificarRechazoPresupuesto({
      noDocumento: dto.noDocumento,
      motivoRechazo: dto.motivoRechazo,
    }).catch((err) => {
      console.warn('[OrdenCompraService] Advertencia al notificar rechazo de presupuesto por correo:', err.message);
    });

    return res;
  }
}
