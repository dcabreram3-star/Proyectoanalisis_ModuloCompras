import { TomaFisicaRepository } from '../repositories/tomaFisica.repository.js';
import {
  ITomaFisicaCreateDTO,
  IGuardarConteoDTO,
  ITomaFisicaResponseDTO,
  IGuardarConteoResponseDTO,
} from '@erp/contracts';

export class TomaFisicaService {
  static async aperturar(data: ITomaFisicaCreateDTO): Promise<{ success: boolean; message: string; idToma?: number }> {
    if (!data.idBodega || typeof data.idBodega !== 'number' || data.idBodega <= 0) {
      throw new Error('Debe especificar un identificador de bodega válido.');
    }

    if (!data.idUsuario || typeof data.idUsuario !== 'number' || data.idUsuario <= 0) {
      throw new Error('Debe especificar un usuario válido para aperturar la toma física.');
    }

    const activa = await TomaFisicaRepository.getActiva(data.idBodega);
    if (activa) {
      throw new Error(`La bodega ya tiene una toma física en proceso (${activa.numeroToma}). Ciérrela antes de abrir otra.`);
    }

    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
    const noToma = `TOMA-${year}-${randomSuffix}`;
    const idToma = await TomaFisicaRepository.aperturar(data, noToma);

    return { success: true, message: 'Toma física aperturada exitosamente.', idToma };
  }

  static async getActiva(idBodega: number): Promise<ITomaFisicaResponseDTO | null> {
    if (!idBodega || typeof idBodega !== 'number' || idBodega <= 0) {
      throw new Error('Identificador de bodega no válido.');
    }
    return TomaFisicaRepository.getActiva(idBodega);
  }

  static async guardarConteo(data: IGuardarConteoDTO): Promise<IGuardarConteoResponseDTO> {
    if (!data.idToma || typeof data.idToma !== 'number' || data.idToma <= 0) {
      throw new Error('Debe especificar un identificador de toma física válido.');
    }

    if (!data.detalles || !Array.isArray(data.detalles) || data.detalles.length === 0) {
      throw new Error('Debe proporcionar al menos un detalle de conteo.');
    }

    // Validación estricta contra cantidades negativas y no numéricas (INV-008)
    for (let i = 0; i < data.detalles.length; i++) {
      const det = data.detalles[i];
      if (!det.codigoArticulo || typeof det.codigoArticulo !== 'string' || det.codigoArticulo.trim() === '') {
        throw new Error(`Código de artículo no válido en la línea #${i + 1}.`);
      }
      if (typeof det.stockFisico !== 'number' || isNaN(det.stockFisico) || !isFinite(det.stockFisico)) {
        throw new Error(`El conteo físico para el artículo "${det.codigoArticulo}" debe ser un valor numérico.`);
      }
      if (det.stockFisico < 0) {
        throw new Error(
          `El conteo físico no puede ser negativo para el artículo "${det.codigoArticulo}" (se ingresó: ${det.stockFisico}).`
        );
      }
      if (!Number.isInteger(det.stockFisico)) {
        throw new Error(
          `El conteo físico para el artículo "${det.codigoArticulo}" debe ser un número entero (se ingresó: ${det.stockFisico}).`
        );
      }
    }

    return TomaFisicaRepository.guardarConteo(data);
  }
}
