import {
  IMovimientoInventarioCreateDTO,
  IMovimientoInventarioResponseDTO,
  IAgregarExistenciasDTO,
} from '@erp/contracts';

const API_BASE = '/api/inventario/movimientos';

export class MovimientoInventarioClientService {
  static async crearMovimiento(payload: IMovimientoInventarioCreateDTO): Promise<IMovimientoInventarioResponseDTO> {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Error al aplicar el movimiento de inventario');
      }

      return resData;
    } catch (error) {
      console.error('[MovimientoInventarioClientService] Error:', error);
      throw error;
    }
  }

  /**
   * Envía la solicitud para añadir existencias a un producto existente
   */
  static async agregarExistencias(payload: IAgregarExistenciasDTO): Promise<IMovimientoInventarioResponseDTO> {
    try {
      const response = await fetch(`${API_BASE}/agregar-existencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Error al añadir existencias al producto');
      }

      return resData;
    } catch (error) {
      console.error('[MovimientoInventarioClientService.agregarExistencias] Error:', error);
      throw error;
    }
  }
}

