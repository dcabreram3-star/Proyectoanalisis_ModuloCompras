import { BitacoraRepository, IBitacoraRegistroDTO, IBitacoraRow } from '../repositories/bitacora.repository.js';

export class BitacoraService {
  /**
   * Registra una acción inalterable en la bitácora de auditoría de Compras.
   */
  static async registrarEvento(dto: IBitacoraRegistroDTO, conn?: any): Promise<void> {
    if (!dto.accion || dto.accion.trim() === '') {
      throw new Error('La acción es obligatoria para registrar en bitácora.');
    }
    await BitacoraRepository.registrar(dto, conn);
  }

  /**
   * Consulta los eventos más recientes de auditoría.
   */
  static async obtenerRecientes(limite: number = 50): Promise<IBitacoraRow[]> {
    return await BitacoraRepository.findRecientes(limite);
  }
}
