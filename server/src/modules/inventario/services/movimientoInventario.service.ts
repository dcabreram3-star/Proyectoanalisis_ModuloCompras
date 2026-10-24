import { MovimientoInventarioRepository } from '../repositories/movimientoInventario.repository.js';
import { IMovimientoInventarioCreateDTO, IMovimientoInventarioResponseDTO } from '@erp/contracts';
import { InventarioCriterios } from '../utils/inventarioCriterios.js';

export class MovimientoInventarioService {
  static async crearMovimiento(data: IMovimientoInventarioCreateDTO): Promise<IMovimientoInventarioResponseDTO> {
    // 1. Validar tipo de movimiento y sus reglas (INV-002)
    if (!data.tipoMovimiento) {
      throw new Error('El tipo de movimiento es obligatorio.');
    }
    const reglaTipo = InventarioCriterios.validarTipoMovimiento(data.tipoMovimiento);

    // 2. Validar bodegas
    if (!data.idBodegaOrigen || typeof data.idBodegaOrigen !== 'number' || data.idBodegaOrigen <= 0) {
      throw new Error('Debe especificar una bodega de origen válida.');
    }

    if (reglaTipo.requiereDestino) {
      if (!data.idBodegaDestino || typeof data.idBodegaDestino !== 'number' || data.idBodegaDestino <= 0) {
        throw new Error('Debe especificar una bodega de destino válida para transferencias.');
      }
      if (data.idBodegaOrigen === data.idBodegaDestino) {
        throw new Error('La bodega de origen y destino no pueden ser la misma.');
      }
    }

    // 3. Validar detalles (INV-002)
    if (!data.detalles || !Array.isArray(data.detalles) || data.detalles.length === 0) {
      throw new Error('El movimiento debe tener al menos un artículo en los detalles.');
    }

    for (let i = 0; i < data.detalles.length; i++) {
      const det = data.detalles[i];
      const indexStr = `en la línea #${i + 1}`;

      // Validar código de artículo
      if (!det.codigoArticulo || typeof det.codigoArticulo !== 'string' || det.codigoArticulo.trim() === '') {
        throw new Error(`Debe especificar un código de artículo válido ${indexStr}.`);
      }

      // Validar cantidad: debe ser un número entero y estrictamente positivo (> 0)
      if (typeof det.cantidad !== 'number' || isNaN(det.cantidad) || !Number.isInteger(det.cantidad) || det.cantidad <= 0) {
        throw new Error(
          `La cantidad para el artículo "${det.codigoArticulo}" ${indexStr} debe ser un número entero y positivo mayor a 0 (recibido: ${det.cantidad}).`
        );
      }

      // Validar costo unitario: debe ser un número válido >= 0
      if (det.costoUnitario !== undefined && det.costoUnitario !== null) {
        if (typeof det.costoUnitario !== 'number' || isNaN(det.costoUnitario) || !isFinite(det.costoUnitario) || det.costoUnitario < 0) {
          throw new Error(
            `El costo unitario para el artículo "${det.codigoArticulo}" ${indexStr} debe ser un valor numérico válido mayor o igual a 0 (recibido: ${det.costoUnitario}).`
          );
        }
      } else if (reglaTipo.afectaCosto && reglaTipo.factor === 1) {
        // En entradas de ajuste se requiere costo >= 0
        det.costoUnitario = 0;
      }
    }

    // Generar número de movimiento oficial
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
    const noMovimiento = `MOV-${year}-${randomSuffix}`;

    const resultado = await MovimientoInventarioRepository.create(data, noMovimiento);

    return {
      success: true,
      message: 'Movimiento de inventario aplicado correctamente.',
      noMovimiento: resultado.noMovimiento,
      advertenciaConcurrencia: resultado.advertenciaConcurrencia
    };
  }
}
