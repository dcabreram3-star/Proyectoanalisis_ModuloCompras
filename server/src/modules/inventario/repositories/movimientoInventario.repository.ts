import { withTransaction } from '../../../config/database.js';
import { IMovimientoInventarioCreateDTO } from '@erp/contracts';
import { InventarioCriterios } from '../utils/inventarioCriterios.js';

export class MovimientoInventarioRepository {
  static async create(
    data: IMovimientoInventarioCreateDTO,
    noMovimiento: string
  ): Promise<{ noMovimiento: string; advertenciaConcurrencia?: string }> {
    try {
      return await withTransaction(async (connection) => {
        // 1. Validar reglas del tipo de movimiento (INV-002)
        const reglaTipo = InventarioCriterios.validarTipoMovimiento(data.tipoMovimiento);

        // 2. Validar que la bodega de origen exista y esté activa
        const sqlBodegaOrigen = `SELECT BOD_ID_BODEGA, BOD_ACTIVO FROM CMP_BODEGA WHERE BOD_ID_BODEGA = :idBodega`;
        const resBodegaOrigen = await connection.execute<any>(sqlBodegaOrigen, { idBodega: data.idBodegaOrigen });
        if (!resBodegaOrigen.rows || resBodegaOrigen.rows.length === 0) {
          throw new Error(`La bodega de origen #${data.idBodegaOrigen} no existe en el catálogo.`);
        }
        if (Number(resBodegaOrigen.rows[0].BOD_ACTIVO || resBodegaOrigen.rows[0][1]) !== 1) {
          throw new Error(`La bodega de origen #${data.idBodegaOrigen} está inactiva.`);
        }

        // Si es transferencia, validar bodega destino
        if (reglaTipo.requiereDestino && data.idBodegaDestino) {
          const sqlBodegaDestino = `SELECT BOD_ID_BODEGA, BOD_ACTIVO FROM CMP_BODEGA WHERE BOD_ID_BODEGA = :idBodega`;
          const resBodegaDestino = await connection.execute<any>(sqlBodegaDestino, { idBodega: data.idBodegaDestino });
          if (!resBodegaDestino.rows || resBodegaDestino.rows.length === 0) {
            throw new Error(`La bodega de destino #${data.idBodegaDestino} no existe en el catálogo.`);
          }
          if (Number(resBodegaDestino.rows[0].BOD_ACTIVO || resBodegaDestino.rows[0][1]) !== 1) {
            throw new Error(`La bodega de destino #${data.idBodegaDestino} está inactiva.`);
          }
        }

        // 3. Validar existencia y estado activo de cada artículo (INV-002)
        for (const det of data.detalles) {
          const sqlArt = `
            SELECT ART_CODIGO_ARTICULO, ART_DESCRIPCION, ART_ACTIVO 
            FROM CMP_ARTICULO 
            WHERE UPPER(TRIM(ART_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
          `;
          const resArt = await connection.execute<any>(sqlArt, { codigo: det.codigoArticulo });
          if (!resArt.rows || resArt.rows.length === 0) {
            throw new Error(`El artículo con código "${det.codigoArticulo}" no existe en el catálogo.`);
          }
          const artActivo = Number(resArt.rows[0].ART_ACTIVO || resArt.rows[0][2] || 0);
          if (artActivo !== 1) {
            throw new Error(`El artículo "${det.codigoArticulo}" se encuentra inactivo y no puede registrar movimientos.`);
          }
        }

        // 4. Control de concurrencia: verificar si hay toma física activa en bodega origen o destino (INV-012)
        let advertenciaConcurrencia: string | undefined;
        let prefijoConcurrencia = '';
        const tomaOrigen = await InventarioCriterios.verificarTomaFisicaActiva(connection, data.idBodegaOrigen);
        if (tomaOrigen.tieneTomaActiva) {
          advertenciaConcurrencia = `Advertencia: Se aplicó un movimiento en la bodega #${data.idBodegaOrigen} mientras tiene una Toma Física activa (${tomaOrigen.numeroToma}). Requiere conciliación de conteo.`;
          prefijoConcurrencia += `[CONCURRENCIA: Toma Física activa ${tomaOrigen.numeroToma} en Bodega #${data.idBodegaOrigen}] `;
        }

        if (reglaTipo.requiereDestino && data.idBodegaDestino) {
          const tomaDestino = await InventarioCriterios.verificarTomaFisicaActiva(connection, data.idBodegaDestino);
          if (tomaDestino.tieneTomaActiva) {
            const adv = `Advertencia: Se aplicó un movimiento con destino en bodega #${data.idBodegaDestino} con Toma Física activa (${tomaDestino.numeroToma}).`;
            advertenciaConcurrencia = advertenciaConcurrencia ? `${advertenciaConcurrencia} | ${adv}` : adv;
            prefijoConcurrencia += `[CONCURRENCIA: Toma Física activa ${tomaDestino.numeroToma} en Bodega #${data.idBodegaDestino}] `;
          }
        }

        // 5. Obtener ID del tipo de movimiento en base de datos
        const sqlTipoMov = `SELECT TMI_ID_TIPO_MOVIMIENTO FROM CMP_TIPO_MOVIMIENTO_INV WHERE TMI_CODIGO = :codigo`;
        const resTipoMov = await connection.execute<any>(sqlTipoMov, { codigo: reglaTipo.codigo });
        let idTipoMovimiento = 1;
        if (resTipoMov.rows && resTipoMov.rows.length > 0) {
          idTipoMovimiento = Number(resTipoMov.rows[0].TMI_ID_TIPO_MOVIMIENTO || resTipoMov.rows[0][0]);
        }

        // Obtener siguiente ID para Cabecera
        const sqlMaxId = `SELECT COALESCE(MAX(MIN_ID_MOVIMIENTO), 0) + 1 AS NEXT_ID FROM CMP_MOVIMIENTO_INVENTARIO`;
        const resMaxId = await connection.execute<any>(sqlMaxId);
        const nextIdMovimiento = Number(resMaxId.rows?.[0]?.NEXT_ID || resMaxId.rows?.[0]?.[0] || 1);

        // 6. Insertar Cabecera de Movimiento
        const sqlCabecera = `
          INSERT INTO CMP_MOVIMIENTO_INVENTARIO (
            MIN_ID_MOVIMIENTO,
            MIN_NUMERO_MOVIMIENTO,
            MIN_ID_TIPO_MOVIMIENTO,
            MIN_ID_BODEGA_ORIGEN,
            MIN_ID_BODEGA_DESTINO,
            MIN_ID_USUARIO,
            MIN_ESTADO,
            MIN_OBSERVACIONES
          ) VALUES (
            :idMov,
            :numero,
            :tipo,
            :bodegaOrigen,
            :bodegaDestino,
            :usuario,
            'APLICADO',
            :observaciones
          )
        `;

        const obsFinal = `${prefijoConcurrencia}${data.observaciones || ''}`.trim() || null;

        await connection.execute(sqlCabecera, {
          idMov: nextIdMovimiento,
          numero: noMovimiento,
          tipo: idTipoMovimiento,
          bodegaOrigen: data.idBodegaOrigen,
          bodegaDestino: data.idBodegaDestino || null,
          usuario: data.idUsuario,
          observaciones: obsFinal,
        });

        // Obtener siguiente ID base para detalles
        const sqlMaxDet = `SELECT COALESCE(MAX(DMI_ID_DETALLE), 0) AS MAX_ID FROM CMP_DETALLE_MOVIMIENTO_INV`;
        const resMaxDet = await connection.execute<any>(sqlMaxDet);
        let currentDetId = Number(resMaxDet.rows?.[0]?.MAX_ID || resMaxDet.rows?.[0]?.[0] || 0);

        // 7. Procesar cada detalle con criterios unificados (INV-010)
        for (const det of data.detalles) {
          let prev = 0;
          let post = 0;
          let costoUnitario = det.costoUnitario || 0;
          let ubiAplicada: number | null = null;
          let loteAplicado: number | null = null;

          if (reglaTipo.codigo === 'AJU_ENTRADA' || reglaTipo.codigo === 'TRF_ENTRADA') {
            const res = await InventarioCriterios.aplicarStockConCriterios({
              conn: connection,
              idBodega: data.idBodegaOrigen,
              codigoArticulo: det.codigoArticulo,
              cantidad: det.cantidad,
              factor: 1,
              costoUnitario: det.costoUnitario || 0,
              idUbicacion: det.idUbicacion,
              idLote: det.idLote,
              afectaCosto: reglaTipo.afectaCosto,
            });
            prev = res.existenciaPrevia;
            post = res.existenciaPosterior;
            costoUnitario = res.costoUnitarioAplicado;
            ubiAplicada = res.idUbicacionValida;
            loteAplicado = res.idLoteValido;
          } else if (reglaTipo.codigo === 'AJU_SALIDA') {
            const res = await InventarioCriterios.aplicarStockConCriterios({
              conn: connection,
              idBodega: data.idBodegaOrigen,
              codigoArticulo: det.codigoArticulo,
              cantidad: det.cantidad,
              factor: -1,
              costoUnitario: det.costoUnitario,
              idUbicacion: det.idUbicacion,
              idLote: det.idLote,
              afectaCosto: false,
            });
            prev = res.existenciaPrevia;
            post = res.existenciaPosterior;
            costoUnitario = res.costoUnitarioAplicado;
            ubiAplicada = res.idUbicacionValida;
            loteAplicado = res.idLoteValido;
          } else if (reglaTipo.codigo === 'TRF_SALIDA') {
            if (!data.idBodegaDestino) throw new Error('Para transferencias se requiere bodega destino.');

            // Descontar origen
            const resOrigen = await InventarioCriterios.aplicarStockConCriterios({
              conn: connection,
              idBodega: data.idBodegaOrigen,
              codigoArticulo: det.codigoArticulo,
              cantidad: det.cantidad,
              factor: -1,
              costoUnitario: det.costoUnitario,
              idUbicacion: det.idUbicacion,
              idLote: det.idLote,
              afectaCosto: false,
            });
            prev = resOrigen.existenciaPrevia;
            post = resOrigen.existenciaPosterior;
            costoUnitario = resOrigen.costoUnitarioAplicado;
            ubiAplicada = resOrigen.idUbicacionValida;
            loteAplicado = resOrigen.idLoteValido;

            // Aumentar destino
            await InventarioCriterios.aplicarStockConCriterios({
              conn: connection,
              idBodega: data.idBodegaDestino,
              codigoArticulo: det.codigoArticulo,
              cantidad: det.cantidad,
              factor: 1,
              costoUnitario: costoUnitario,
              idUbicacion: null, // Destino usará ubicación por defecto
              idLote: loteAplicado,
              afectaCosto: false,
            });
          }

          currentDetId++;

          // Insertar detalle del movimiento con lotes y ubicaciones unificados (INV-010)
          const sqlDetalle = `
            INSERT INTO CMP_DETALLE_MOVIMIENTO_INV (
              DMI_ID_DETALLE,
              DMI_ID_MOVIMIENTO,
              DMI_CODIGO_ARTICULO,
              DMI_ID_LOTE,
              DMI_ID_UBICACION,
              DMI_CANTIDAD,
              DMI_COSTO_UNITARIO,
              DMI_COSTO_TOTAL,
              DMI_EXISTENCIA_PREVIA,
              DMI_EXISTENCIA_POSTERIOR
            ) VALUES (
              :idDet,
              :idMov,
              :codigoArticulo,
              :idLote,
              :idUbi,
              :cantidad,
              :costoUnitario,
              :costoTotal,
              :prev,
              :post
            )
          `;

          await connection.execute(sqlDetalle, {
            idDet: currentDetId,
            idMov: nextIdMovimiento,
            codigoArticulo: det.codigoArticulo,
            idLote: loteAplicado,
            idUbi: ubiAplicada,
            cantidad: det.cantidad,
            costoUnitario: costoUnitario,
            costoTotal: +(costoUnitario * det.cantidad).toFixed(2),
            prev,
            post,
          });
        }

        return { noMovimiento, advertenciaConcurrencia };
      });
    } catch (error: any) {
      if (error.message && error.message.includes('ORA-00001')) {
        throw new Error('Error de base de datos: Conflicto de identificadores duplicados al intentar registrar el movimiento.');
      }
      throw error;
    }
  }
}
