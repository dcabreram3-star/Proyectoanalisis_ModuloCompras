import { RecepcionBodegaRepository } from '../repositories/recepcionBodega.repository.js';
import {
  IRecepcionBodega,
  IRecepcionBodegaCompleta,
  IRegistrarRecepcionDTO,
  IRecepcionFilterParams,
} from '@erp/contracts';

export class RecepcionBodegaService {
  static async obtenerRecepciones(filters: IRecepcionFilterParams = {}): Promise<IRecepcionBodega[]> {
    return await RecepcionBodegaRepository.findAll(filters);
  }

  static async obtenerPorNoRecepcion(noRecepcion: string): Promise<IRecepcionBodegaCompleta | null> {
    if (!noRecepcion || noRecepcion.trim() === '') {
      throw new Error('El número de recepción es obligatorio.');
    }
    return await RecepcionBodegaRepository.findByNoRecepcion(noRecepcion.trim());
  }

  static async obtenerPorNoPo(noPo: string): Promise<IRecepcionBodegaCompleta | null> {
    if (!noPo || noPo.trim() === '') {
      throw new Error('El número de orden de compra (PO) es obligatorio.');
    }
    return await RecepcionBodegaRepository.findByNoPo(noPo.trim());
  }

  static async registrarRecepcion(dto: IRegistrarRecepcionDTO): Promise<IRecepcionBodegaCompleta> {
    if (!dto.noPo || dto.noPo.trim() === '') {
      throw new Error('El número de PO es requerido para registrar la recepción.');
    }
    if (!dto.idBodega) {
      throw new Error('Debe seleccionar la bodega de destino para el ingreso físico.');
    }

    // Validación estricta de control de horario de recepción (08:00 a 20:00 hrs)
    if (dto.fechaLlegada) {
      const fechaVal = String(dto.fechaLlegada);
      let hours: number | null = null;
      let minutes: number = 0;

      if (fechaVal.includes('T')) {
        const timePart = fechaVal.split('T')[1];
        if (timePart) {
          const parts = timePart.split(':');
          hours = Number(parts[0]);
          minutes = Number(parts[1] || 0);
        }
      } else {
        const d = new Date(dto.fechaLlegada);
        if (!isNaN(d.getTime())) {
          hours = d.getHours();
          minutes = d.getMinutes();
        }
      }

      if (hours !== null && !isNaN(hours)) {
        if (hours < 8) {
          throw new Error('Horario no autorizado (Madrugada): Las recepciones en bodega únicamente están permitidas dentro del horario diurno a partir de las 8:00 AM (08:00 hrs). El registro en horario de madrugada (00:00 a 07:59 hrs) no está permitido.');
        }
        if (hours > 20 || (hours === 20 && minutes > 0)) {
          throw new Error('Horario no autorizado (Nocturno): Las recepciones en bodega únicamente están permitidas hasta las 8:00 PM (20:00 hrs). El registro en horario nocturno posterior a las 20:00 hrs no está permitido.');
        }
      }
    }
    
    const items = (dto.detalles && dto.detalles.length > 0) ? dto.detalles : (dto.items || []);
    if (!items || items.length === 0) {
      throw new Error('Debe incluir al menos un artículo en la recepción.');
    }

    for (const d of items) {
      const cant = Number(d.cantidadRecibida ?? 0);
      if (!Number.isInteger(cant) || cant < 0) {
        throw new Error(`La cantidad recibida (${d.cantidadRecibida}) para el artículo ${d.codigoArticulo || ''} debe ser un número entero mayor o igual a 0.`);
      }
      d.cantidadRecibida = cant;
    }

    const algunRecibido = items.some((d) => Number(d.cantidadRecibida || 0) > 0);
    if (!algunRecibido) {
      throw new Error('Debe recibir al menos 1 unidad física entera en algún artículo para procesar la entrada.');
    }

    return await RecepcionBodegaRepository.registrarRecepcion(dto);
  }
}
