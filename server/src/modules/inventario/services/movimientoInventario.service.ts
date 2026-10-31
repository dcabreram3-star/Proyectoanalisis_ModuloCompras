import { MovimientoInventarioRepository } from '../repositories/movimientoInventario.repository.js';
import {
  IMovimientoInventarioCreateDTO,
  IMovimientoInventarioResponseDTO,
  IAgregarExistenciasDTO,
  agregarExistenciasSchema,
} from '@erp/contracts';
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

      // Validar cantidad: debe ser un número entero o decimal positivo mayor a cero (> 0)
      if (typeof det.cantidad !== 'number' || isNaN(det.cantidad) || !isFinite(det.cantidad) || det.cantidad <= 0) {
        throw new Error(
          `La cantidad para el artículo "${det.codigoArticulo}" ${indexStr} debe ser un número positivo mayor a 0 (recibido: ${det.cantidad}).`
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

  /**
   * Registra un incremento directo de existencias a un artículo existente en una bodega específica.
   * Actualiza atómicamente CMP_INVENTARIO y registra el movimiento de kardex como 'AJU_ENTRADA'.
   * Valida estrictamente que la cantidad sea un número entero positivo (>= 1).
   */
  static async agregarExistencias(
    data: IAgregarExistenciasDTO,
    idUsuarioSesion?: number
  ): Promise<IMovimientoInventarioResponseDTO> {
    // 1. Validación estricta mediante esquema Zod (rechaza decimales, ceros o negativos)
    const validated = agregarExistenciasSchema.parse(data);

    // 2. Validación explícita de seguridad: entero positivo >= 1
    if (!Number.isInteger(validated.cantidad) || validated.cantidad < 1) {
      throw new Error('La cantidad a añadir debe ser un número entero positivo mayor o igual a 1.');
    }

    const codArticuloClean = validated.codigoArticulo.trim().toUpperCase();
    const idUsuarioFinal = validated.idUsuario ? Number(validated.idUsuario) : (idUsuarioSesion || 1);
    const costoUnitario = validated.costoUnitario !== undefined && validated.costoUnitario !== null ? Number(validated.costoUnitario) : undefined;

    const payload: IMovimientoInventarioCreateDTO = {
      tipoMovimiento: 'AJU_ENTRADA',
      idBodegaOrigen: validated.idBodega,
      idUsuario: idUsuarioFinal,
      observaciones: validated.notas?.trim() || `Ajuste manual de entrada / Añadir existencias a ${codArticuloClean}`,
      detalles: [
        {
          codigoArticulo: codArticuloClean,
          cantidad: validated.cantidad,
          costoUnitario: costoUnitario !== undefined ? costoUnitario : 0,
          idUbicacion: validated.idUbicacion ? Number(validated.idUbicacion) : undefined,
          idLote: validated.idLote ? Number(validated.idLote) : undefined,
        },
      ],
    };

    return await this.crearMovimiento(payload);
  }
}

