import { execute, withTransaction } from '../../../config/database.js';
import {
  ITomaFisicaCreateDTO,
  IGuardarConteoDTO,
  ITomaFisicaResponseDTO,
  IGuardarConteoResponseDTO,
  IMovimientoConcurrenteDTO,
} from '@erp/contracts';
import { InventarioCriterios } from '../utils/inventarioCriterios.js';

export class TomaFisicaRepository {
  /**
   * Verifica si existe una toma física en proceso para una bodega
   */
  static async getActiva(idBodega: number): Promise<ITomaFisicaResponseDTO | null> {
    const sqlToma = `
      SELECT TOM_ID_TOMA, TOM_NUMERO_TOMA, TOM_ESTADO
      FROM CMP_TOMA_FISICA 
      WHERE TOM_ID_BODEGA = :idBodega AND TOM_ESTADO = 'ABIERTA'
    `;
    const resToma = await execute<any>(sqlToma, { idBodega });
    
    if (!resToma.rows || resToma.rows.length === 0) return null;
    
    const toma = resToma.rows[0];

    const sqlDetalles = `
      SELECT D.DTF_ID_DETALLE, D.DTF_CODIGO_ARTICULO, A.ART_DESCRIPCION, D.DTF_STOCK_TEORICO, D.DTF_STOCK_FISICO, D.DTF_DIFERENCIA
      FROM CMP_DETALLE_TOMA_FISICA D
      JOIN CMP_ARTICULO A ON UPPER(TRIM(D.DTF_CODIGO_ARTICULO)) = UPPER(TRIM(A.ART_CODIGO_ARTICULO))
      WHERE D.DTF_ID_TOMA = :idToma
      ORDER BY A.ART_DESCRIPCION ASC
    `;
    const resDetalles = await execute<any>(sqlDetalles, { idToma: toma.TOM_ID_TOMA });

    return {
      idToma: Number(toma.TOM_ID_TOMA),
      numeroToma: toma.TOM_NUMERO_TOMA,
      idBodega,
      estado: toma.TOM_ESTADO,
      detalles: (resDetalles.rows || []).map((r: any) => ({
        idDetalle: Number(r.DTF_ID_DETALLE),
        codigoArticulo: r.DTF_CODIGO_ARTICULO,
        nombreArticulo: r.ART_DESCRIPCION,
        stockTeorico: Number(r.DTF_STOCK_TEORICO || 0),
        stockFisico: r.DTF_STOCK_FISICO !== null && r.DTF_STOCK_FISICO !== undefined ? Number(r.DTF_STOCK_FISICO) : null,
        diferencia: r.DTF_DIFERENCIA !== null && r.DTF_DIFERENCIA !== undefined ? Number(r.DTF_DIFERENCIA) : null,
      }))
    };
  }

  /**
   * Apertura una nueva toma física, congelando el stock actual como teórico
   * Valida exclusividad y estado de la bodega (INV-008)
   */
  static async aperturar(data: ITomaFisicaCreateDTO, noToma: string): Promise<number> {
    return withTransaction(async (conn) => {
      // 1. Validar que la bodega exista y esté activa (INV-008)
      const sqlBodega = `SELECT BOD_ID_BODEGA, BOD_NOMBRE, BOD_ACTIVO FROM CMP_BODEGA WHERE BOD_ID_BODEGA = :idBodega`;
      const resBodega = await conn.execute<any>(sqlBodega, { idBodega: data.idBodega });
      if (!resBodega.rows || resBodega.rows.length === 0) {
        throw new Error(`La bodega #${data.idBodega} no existe en el catálogo.`);
      }
      if (Number(resBodega.rows[0].BOD_ACTIVO || resBodega.rows[0][2] || 0) !== 1) {
        throw new Error(`La bodega #${data.idBodega} (${resBodega.rows[0].BOD_NOMBRE || ''}) está inactiva.`);
      }

      // 2. Validar exclusividad: que no exista OTRA toma física abierta en el sistema o bodega (INV-008)
      const sqlExclusividad = `
        SELECT TOM_ID_TOMA, TOM_NUMERO_TOMA, TOM_ID_BODEGA 
        FROM CMP_TOMA_FISICA 
        WHERE TOM_ESTADO = 'ABIERTA'
      `;
      const resExclusividad = await conn.execute<any>(sqlExclusividad);
      if (resExclusividad.rows && resExclusividad.rows.length > 0) {
        const abierta = resExclusividad.rows[0];
        const num = abierta.TOM_NUMERO_TOMA || abierta[1];
        const bod = abierta.TOM_ID_BODEGA || abierta[2];
        throw new Error(
          `Ya existe una toma física abierta en el sistema (${num} en bodega #${bod}). Debe cerrarse antes de aperturar otra.`
        );
      }

      // 3. Obtener ID cabecera
      const sqlMax = `SELECT COALESCE(MAX(TOM_ID_TOMA), 0) + 1 AS NEXT_ID FROM CMP_TOMA_FISICA`;
      const resMax = await conn.execute<any>(sqlMax);
      const idToma = Number(resMax.rows?.[0]?.NEXT_ID || resMax.rows?.[0]?.[0] || 1);

      // 4. Insertar Cabecera con CURRENT_TIMESTAMP para control de concurrencia exacto
      const sqlCabecera = `
        INSERT INTO CMP_TOMA_FISICA (
          TOM_ID_TOMA, TOM_NUMERO_TOMA, TOM_ID_BODEGA, TOM_FECHA_TOMA, TOM_ESTADO, TOM_ID_USUARIO_CREA
        ) VALUES (
          :idToma, :noToma, :bodega, CURRENT_TIMESTAMP, 'ABIERTA', :usuario
        )
      `;
      await conn.execute(sqlCabecera, {
        idToma,
        noToma,
        bodega: data.idBodega,
        usuario: data.idUsuario,
      });

      // 5. Consultar stock actual e insertar detalles congelados
      const sqlInv = `
        SELECT INV_CODIGO_ARTICULO, INV_EXISTENCIA_ACTUAL, INV_COSTO_PROMEDIO_LOCAL, INV_ID_UBICACION_DEFECTO 
        FROM CMP_INVENTARIO 
        WHERE INV_ID_BODEGA = :bodega
      `;
      const resInv = await conn.execute<any>(sqlInv, { bodega: data.idBodega });
      const inventario = resInv.rows || [];

      if (inventario.length > 0) {
        const sqlMaxDet = `SELECT COALESCE(MAX(DTF_ID_DETALLE), 0) AS MAX_ID FROM CMP_DETALLE_TOMA_FISICA`;
        const resMaxDet = await conn.execute<any>(sqlMaxDet);
        let idDetalle = Number(resMaxDet.rows?.[0]?.MAX_ID || resMaxDet.rows?.[0]?.[0] || 0);

        for (const inv of inventario) {
          idDetalle++;
          const codArt = inv.INV_CODIGO_ARTICULO || inv[0];
          const stockActual = Number(inv.INV_EXISTENCIA_ACTUAL || inv[1] || 0);
          const costoUnit = Number(inv.INV_COSTO_PROMEDIO_LOCAL || inv[2] || 0);
          const ubi = inv.INV_ID_UBICACION_DEFECTO || inv[3] || null;

          const sqlInsDet = `
            INSERT INTO CMP_DETALLE_TOMA_FISICA (
              DTF_ID_DETALLE, DTF_ID_TOMA, DTF_CODIGO_ARTICULO, DTF_ID_UBICACION, DTF_STOCK_TEORICO, DTF_STOCK_FISICO, DTF_DIFERENCIA, DTF_COSTO_UNITARIO, DTF_COSTO_DIFERENCIA, DTF_AJUSTADO
            ) VALUES (
              :idDet, :idToma, :codigo, :idUbi, :teorico, 0, 0, :costo, 0, 0
            )
          `;
          await conn.execute(sqlInsDet, {
            idDet: idDetalle,
            idToma,
            codigo: codArt,
            idUbi: ubi,
            teorico: stockActual,
            costo: costoUnit,
          });
        }
      }

      return idToma;
    });
  }

  /**
   * Guarda los conteos físicos, sincroniza el stock en CMP_INVENTARIO,
   * genera los movimientos atómicos de ajuste (INV-003),
   * bloquea conteos negativos (INV-008) y reconcilia concurrencia (INV-012).
   */
  static async guardarConteo(data: IGuardarConteoDTO): Promise<IGuardarConteoResponseDTO> {
    return withTransaction(async (conn) => {
      // 1. Validar existencia y estado actual de la toma física (INV-008)
      const sqlToma = `
        SELECT 
          TOM_ID_TOMA, 
          TOM_NUMERO_TOMA, 
          TOM_ID_BODEGA, 
          TOM_ESTADO, 
          TOM_FECHA_TOMA,
          TOM_OBSERVACIONES
        FROM CMP_TOMA_FISICA 
        WHERE TOM_ID_TOMA = :idToma
        FOR UPDATE
      `;
      const resToma = await conn.execute<any>(sqlToma, { idToma: data.idToma });
      if (!resToma.rows || resToma.rows.length === 0) {
        throw new Error(`La toma física #${data.idToma} no existe.`);
      }

      const toma = resToma.rows[0];
      const estadoActual = String(toma.TOM_ESTADO || toma[3]);
      const noToma = String(toma.TOM_NUMERO_TOMA || toma[1]);
      const idBodega = Number(toma.TOM_ID_BODEGA || toma[2]);
      const fechaToma = toma.TOM_FECHA_TOMA || toma[4];

      if (estadoActual !== 'ABIERTA') {
        throw new Error(
          `La toma física ${noToma} ya se encuentra ${estadoActual} y no puede volver a cerrarse ni modificarse.`
        );
      }

      // 2. Validar que vengan detalles y que NO contengan cantidades negativas (INV-008)
      if (!data.detalles || !Array.isArray(data.detalles) || data.detalles.length === 0) {
        throw new Error('Debe proporcionar al menos un detalle de conteo para cerrar la toma física.');
      }

      for (const det of data.detalles) {
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

      // 3. Consultar los detalles teóricos congelados
      const sqlDetallesActuales = `
        SELECT 
          DTF_ID_DETALLE, 
          DTF_CODIGO_ARTICULO, 
          DTF_ID_UBICACION, 
          DTF_STOCK_TEORICO, 
          DTF_COSTO_UNITARIO
        FROM CMP_DETALLE_TOMA_FISICA 
        WHERE DTF_ID_TOMA = :idToma
      `;
      const resDetActuales = await conn.execute<any>(sqlDetallesActuales, { idToma: data.idToma });
      const detallesTeoricos = resDetActuales.rows || [];
      const mapaTeorico = new Map<string, any>();
      for (const row of detallesTeoricos) {
        const cod = String(row.DTF_CODIGO_ARTICULO || row[1]).toUpperCase().trim();
        mapaTeorico.set(cod, {
          idDetalle: Number(row.DTF_ID_DETALLE || row[0]),
          stockTeorico: Number(row.DTF_STOCK_TEORICO || row[3] || 0),
          costoUnitario: Number(row.DTF_COSTO_UNITARIO || row[4] || 0),
          idUbicacion: row.DTF_ID_UBICACION || row[2] || null,
        });
      }

      // Listas para movimientos de ajuste atómicos (INV-003)
      const articulosAjustePositivo: Array<{ codigo: string; diferencia: number; costo: number; teorico: number; fisico: number; ubi: number | null }> = [];
      const articulosAjusteNegativo: Array<{ codigo: string; diferencia: number; costo: number; teorico: number; fisico: number; ubi: number | null }> = [];

      // 4. Actualizar CMP_DETALLE_TOMA_FISICA y sincronizar stock real en CMP_INVENTARIO
      for (const det of data.detalles) {
        const codNormalizado = det.codigoArticulo.toUpperCase().trim();
        const teoricoInfo = mapaTeorico.get(codNormalizado);
        const stockTeorico = teoricoInfo ? teoricoInfo.stockTeorico : 0;
        const costoUnit = teoricoInfo ? teoricoInfo.costoUnitario : 0;
        const ubi = teoricoInfo ? teoricoInfo.idUbicacion : null;

        const diferencia = det.stockFisico - stockTeorico;
        const costoDiferencia = +(diferencia * costoUnit).toFixed(2);

        // Actualizar detalle de la toma física
        const sqlUpdDet = `
          UPDATE CMP_DETALLE_TOMA_FISICA
          SET 
            DTF_STOCK_FISICO = :fisico,
            DTF_DIFERENCIA = :diferencia,
            DTF_COSTO_DIFERENCIA = :costoDif,
            DTF_AJUSTADO = 1
          WHERE DTF_ID_TOMA = :idToma AND UPPER(TRIM(DTF_CODIGO_ARTICULO)) = :codigo
        `;
        await conn.execute(sqlUpdDet, {
          fisico: det.stockFisico,
          diferencia,
          costoDif: costoDiferencia,
          idToma: data.idToma,
          codigo: codNormalizado,
        });

        // Sincronizar existencias reales en CMP_INVENTARIO (INV-003)
        const sqlCheckInv = `
          SELECT INV_ID_INVENTARIO, INV_STOCK_RESERVADO 
          FROM CMP_INVENTARIO 
          WHERE INV_ID_BODEGA = :bodega AND UPPER(TRIM(INV_CODIGO_ARTICULO)) = :codigo
          FOR UPDATE
        `;
        const resCheckInv = await conn.execute<any>(sqlCheckInv, { bodega: idBodega, codigo: codNormalizado });

        if (resCheckInv.rows && resCheckInv.rows.length > 0) {
          const reservado = Number(resCheckInv.rows[0].INV_STOCK_RESERVADO || resCheckInv.rows[0][1] || 0);
          const sqlUpdInv = `
            UPDATE CMP_INVENTARIO 
            SET INV_EXISTENCIA_ACTUAL = :fisico,
                INV_STOCK_DISPONIBLE = GREATEST(0, :fisico - :reservado),
                INV_FECHA_ULTIMO_MOVIMIENTO = CURRENT_TIMESTAMP
            WHERE INV_ID_BODEGA = :bodega AND UPPER(TRIM(INV_CODIGO_ARTICULO)) = :codigo
          `;
          await conn.execute(sqlUpdInv, {
            fisico: det.stockFisico,
            reservado,
            bodega: idBodega,
            codigo: codNormalizado,
          });
        } else {
          // Si no existía fila en CMP_INVENTARIO para ese artículo en esa bodega, insertarla
          const sqlMaxInv = `SELECT COALESCE(MAX(INV_ID_INVENTARIO), 0) + 1 AS NEXT_INV_ID FROM CMP_INVENTARIO`;
          const resMaxInv = await conn.execute<any>(sqlMaxInv);
          const nextInvId = Number(resMaxInv.rows?.[0]?.NEXT_INV_ID || resMaxInv.rows?.[0]?.[0] || 1);

          const sqlInsInv = `
            INSERT INTO CMP_INVENTARIO (
              INV_ID_INVENTARIO, INV_ID_BODEGA, INV_CODIGO_ARTICULO, INV_ID_UBICACION_DEFECTO,
              INV_EXISTENCIA_ACTUAL, INV_STOCK_RESERVADO, INV_STOCK_DISPONIBLE,
              INV_STOCK_MINIMO, INV_STOCK_MAXIMO, INV_PUNTO_REORDEN,
              INV_COSTO_PROMEDIO_LOCAL, INV_ULTIMO_COSTO_COMPRA, INV_FECHA_ULTIMO_MOVIMIENTO
            ) VALUES (
              :idInv, :bodega, :codigo, :idUbi,
              :fisico, 0, :fisico,
              0, GREATEST(1000, :fisico * 2), 5,
              :costo, :costo, CURRENT_TIMESTAMP
            )
          `;
          await conn.execute(sqlInsInv, {
            idInv: nextInvId,
            bodega: idBodega,
            codigo: codNormalizado,
            idUbi: ubi,
            fisico: det.stockFisico,
            costo: costoUnit,
          });
        }

        // Clasificar para movimientos de ajuste atómicos
        if (diferencia > 0) {
          articulosAjustePositivo.push({
            codigo: codNormalizado,
            diferencia,
            costo: costoUnit,
            teorico: stockTeorico,
            fisico: det.stockFisico,
            ubi,
          });
        } else if (diferencia < 0) {
          articulosAjusteNegativo.push({
            codigo: codNormalizado,
            diferencia: Math.abs(diferencia),
            costo: costoUnit,
            teorico: stockTeorico,
            fisico: det.stockFisico,
            ubi,
          });
        }
      }

      // 5. Generar movimientos de ajuste en CMP_MOVIMIENTO_INVENTARIO atómicamente (INV-003)
      let nextMovId = 0;
      const getNextMovId = async () => {
        const sqlM = `SELECT COALESCE(MAX(MIN_ID_MOVIMIENTO), 0) + 1 AS NEXT_ID FROM CMP_MOVIMIENTO_INVENTARIO`;
        const r = await conn.execute<any>(sqlM);
        return Number(r.rows?.[0]?.NEXT_ID || r.rows?.[0]?.[0] || 1);
      };

      let currentDetMovId = 0;
      const getNextDetMovId = async () => {
        const sqlD = `SELECT COALESCE(MAX(DMI_ID_DETALLE), 0) AS MAX_ID FROM CMP_DETALLE_MOVIMIENTO_INV`;
        const r = await conn.execute<any>(sqlD);
        return Number(r.rows?.[0]?.MAX_ID || r.rows?.[0]?.[0] || 0);
      };

      currentDetMovId = await getNextDetMovId();

      // Ajuste de Entrada (Positivo)
      if (articulosAjustePositivo.length > 0) {
        nextMovId = await getNextMovId();
        const numMovEnt = `MOV-AJU-ENT-${noToma}`;
        const obsEnt = `Ajuste positivo automático por Toma Física ${noToma}. Cantidad de artículos ajustados: ${articulosAjustePositivo.length}.`;

        const sqlInsMovEnt = `
          INSERT INTO CMP_MOVIMIENTO_INVENTARIO (
            MIN_ID_MOVIMIENTO, MIN_NUMERO_MOVIMIENTO, MIN_ID_TIPO_MOVIMIENTO,
            MIN_ID_BODEGA_ORIGEN, MIN_FECHA_MOVIMIENTO, MIN_REFERENCIA_EXTERNA,
            MIN_ID_USUARIO, MIN_ESTADO, MIN_OBSERVACIONES
          ) VALUES (
            :idMov, :numMov, 8,
            :bodega, CURRENT_TIMESTAMP, :refExt,
            :usuario, 'APLICADO', :obs
          )
        `;
        await conn.execute(sqlInsMovEnt, {
          idMov: nextMovId,
          numMov: numMovEnt,
          bodega: idBodega,
          refExt: noToma,
          usuario: Number(data.idUsuario) || 1,
          obs: obsEnt,
        });

        for (const item of articulosAjustePositivo) {
          currentDetMovId++;
          const sqlDetEnt = `
            INSERT INTO CMP_DETALLE_MOVIMIENTO_INV (
              DMI_ID_DETALLE, DMI_ID_MOVIMIENTO, DMI_CODIGO_ARTICULO,
              DMI_ID_UBICACION, DMI_CANTIDAD, DMI_COSTO_UNITARIO,
              DMI_COSTO_TOTAL, DMI_EXISTENCIA_PREVIA, DMI_EXISTENCIA_POSTERIOR
            ) VALUES (
              :idDet, :idMov, :codigo,
              :idUbi, :cant, :costo,
              :costoTot, :prev, :post
            )
          `;
          await conn.execute(sqlDetEnt, {
            idDet: currentDetMovId,
            idMov: nextMovId,
            codigo: item.codigo,
            idUbi: item.ubi,
            cant: item.diferencia,
            costo: item.costo,
            costoTot: +(item.diferencia * item.costo).toFixed(2),
            prev: item.teorico,
            post: item.fisico,
          });
        }
      }

      // Ajuste de Salida (Negativo)
      if (articulosAjusteNegativo.length > 0) {
        nextMovId = await getNextMovId();
        const numMovSal = `MOV-AJU-SAL-${noToma}`;
        const obsSal = `Ajuste negativo automático por Toma Física ${noToma}. Cantidad de artículos ajustados: ${articulosAjusteNegativo.length}.`;

        const sqlInsMovSal = `
          INSERT INTO CMP_MOVIMIENTO_INVENTARIO (
            MIN_ID_MOVIMIENTO, MIN_NUMERO_MOVIMIENTO, MIN_ID_TIPO_MOVIMIENTO,
            MIN_ID_BODEGA_ORIGEN, MIN_FECHA_MOVIMIENTO, MIN_REFERENCIA_EXTERNA,
            MIN_ID_USUARIO, MIN_ESTADO, MIN_OBSERVACIONES
          ) VALUES (
            :idMov, :numMov, 3,
            :bodega, CURRENT_TIMESTAMP, :refExt,
            :usuario, 'APLICADO', :obs
          )
        `;
        await conn.execute(sqlInsMovSal, {
          idMov: nextMovId,
          numMov: numMovSal,
          bodega: idBodega,
          refExt: noToma,
          usuario: Number(data.idUsuario) || 1,
          obs: obsSal,
        });

        for (const item of articulosAjusteNegativo) {
          currentDetMovId++;
          const sqlDetSal = `
            INSERT INTO CMP_DETALLE_MOVIMIENTO_INV (
              DMI_ID_DETALLE, DMI_ID_MOVIMIENTO, DMI_CODIGO_ARTICULO,
              DMI_ID_UBICACION, DMI_CANTIDAD, DMI_COSTO_UNITARIO,
              DMI_COSTO_TOTAL, DMI_EXISTENCIA_PREVIA, DMI_EXISTENCIA_POSTERIOR
            ) VALUES (
              :idDet, :idMov, :codigo,
              :idUbi, :cant, :costo,
              :costoTot, :prev, :post
            )
          `;
          await conn.execute(sqlDetSal, {
            idDet: currentDetMovId,
            idMov: nextMovId,
            codigo: item.codigo,
            idUbi: item.ubi,
            cant: item.diferencia,
            costo: item.costo,
            costoTot: +(item.diferencia * item.costo).toFixed(2),
            prev: item.teorico,
            post: item.fisico,
          });
        }
      }

      // 6. Control de Concurrencia (INV-012): verificar movimientos concurrentes ocurridos durante el conteo
      let movimientosConcurrentes: IMovimientoConcurrenteDTO[] = [];
      let advertenciaConcurrencia: string | undefined;

      try {
        const sqlConcurrencia = `
          SELECT 
            M.MIN_ID_MOVIMIENTO,
            M.MIN_NUMERO_MOVIMIENTO,
            TO_CHAR(M.MIN_FECHA_MOVIMIENTO, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_MOV,
            T.TMI_CODIGO,
            D.DMI_CODIGO_ARTICULO,
            D.DMI_CANTIDAD
          FROM CMP_MOVIMIENTO_INVENTARIO M
          JOIN CMP_TIPO_MOVIMIENTO_INV T ON M.MIN_ID_TIPO_MOVIMIENTO = T.TMI_ID_TIPO_MOVIMIENTO
          JOIN CMP_DETALLE_MOVIMIENTO_INV D ON M.MIN_ID_MOVIMIENTO = D.DMI_ID_MOVIMIENTO
          WHERE (M.MIN_ID_BODEGA_ORIGEN = :idBodega OR M.MIN_ID_BODEGA_DESTINO = :idBodega)
            AND M.MIN_FECHA_MOVIMIENTO >= :fechaApertura
            AND M.MIN_NUMERO_MOVIMIENTO NOT LIKE 'MOV-AJU-%' || :noToma
          ORDER BY M.MIN_FECHA_MOVIMIENTO ASC
        `;
        const resConc = await conn.execute<any>(sqlConcurrencia, {
          idBodega,
          fechaApertura: fechaToma,
          noToma,
        });

        if (resConc.rows && resConc.rows.length > 0) {
          movimientosConcurrentes = resConc.rows.map((r: any) => ({
            idMovimiento: Number(r.MIN_ID_MOVIMIENTO || r[0]),
            numeroMovimiento: String(r.MIN_NUMERO_MOVIMIENTO || r[1]),
            fechaMovimiento: String(r.FECHA_MOV || r[2]),
            tipoMovimiento: String(r.TMI_CODIGO || r[3]),
            codigoArticulo: String(r.DMI_CODIGO_ARTICULO || r[4]),
            cantidad: Number(r.DMI_CANTIDAD || r[5]),
          }));

          const articulosAfectados = Array.from(new Set(movimientosConcurrentes.map(m => m.codigoArticulo))).join(', ');
          advertenciaConcurrencia = `Se detectaron ${movimientosConcurrentes.length} movimiento(s) de inventario concurrentes aplicados durante el conteo físico en bodega #${idBodega}. Artículos afectados: ${articulosAfectados}. Se recomienda conciliar diferencias.`;
        }
      } catch (_err) {
        // Ignorar fallos de análisis concurrente opcional
      }

      // 7. Cerrar la toma física formalmente
      const obsFinales = advertenciaConcurrencia
        ? `[CONCURRENCIA DETECTADA]: ${advertenciaConcurrencia.substring(0, 450)}`
        : 'Toma física ajustada y cerrada satisfactoriamente.';

      const sqlCerrar = `
        UPDATE CMP_TOMA_FISICA
        SET TOM_ESTADO = 'AJUSTADA',
            TOM_ID_USUARIO_CIERRA = :usuario,
            TOM_FECHA_CIERRE = CURRENT_TIMESTAMP,
            TOM_OBSERVACIONES = :observaciones
        WHERE TOM_ID_TOMA = :idToma
      `;
      await conn.execute(sqlCerrar, {
        usuario: data.idUsuario,
        observaciones: obsFinales,
        idToma: data.idToma,
      });

      return {
        success: true,
        message: 'Conteo físico guardado, stock sincronizado y toma física cerrada correctamente.',
        movimientosConcurrentes: movimientosConcurrentes.length > 0 ? movimientosConcurrentes : undefined,
        advertenciaConcurrencia,
      };
    });
  }
}
