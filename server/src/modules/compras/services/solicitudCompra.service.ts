import { SolicitudCompraRepository } from '../repositories/solicitudCompra.repository.js';
import { ISolicitudCompra, ISolicitudCompraFilterParams } from '@erp/contracts';

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

  static async crearSolicitud(data: import('@erp/contracts').ISolicitudCompraCreateDTO): Promise<ISolicitudCompra> {
    if (!data.detalles || data.detalles.length === 0) {
      throw new Error('La solicitud debe tener al menos un detalle.');
    }

    // Para efectos de prueba sin secuencia PL/SQL conocida: generar ID alfanumérico basado en timestamp/random
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const noDocumento = `SOL-2026-${randomSuffix}`;

    await SolicitudCompraRepository.create(data, noDocumento);

    // Recuperar la solicitud recién creada para devolverla completa
    const solicitudCreada = await this.obtenerSolicitudPorNoDocumento(noDocumento);
    if (!solicitudCreada) {
      throw new Error('Error al recuperar la solicitud creada de la base de datos.');
    }
    
    return solicitudCreada;
  }
}
