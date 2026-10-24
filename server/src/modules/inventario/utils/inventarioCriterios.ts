import oracledb from 'oracledb';

export interface IReglaTipoMovimiento {
  codigo: string;
  naturaleza: '+' | '-';
  factor: 1 | -1;
  afectaCosto: boolean;
  requiereDestino: boolean;
  descripcion: string;
}

export const REGLAS_TIPOS_MOVIMIENTO: Record<string, IReglaTipoMovimiento> = {
  AJU_ENTRADA: {
    codigo: 'AJU_ENTRADA',
    naturaleza: '+',
    factor: 1,
    afectaCosto: true,
    requiereDestino: false,
    descripcion: 'Ajuste de inventario positivo (Entrada)',
  },
  AJU_SALIDA: {
    codigo: 'AJU_SALIDA',
    naturaleza: '-',
    factor: -1,
    afectaCosto: true,
    requiereDestino: false,
    descripcion: 'Ajuste de inventario negativo (Salida)',
  },
  TRF_SALIDA: {
    codigo: 'TRF_SALIDA',
    naturaleza: '-',
    factor: -1,
    afectaCosto: false,
    requiereDestino: true,
    descripcion: 'Salida por transferencia entre bodegas',
  },
  TRF_ENTRADA: {
    codigo: 'TRF_ENTRADA',
    naturaleza: '+',
    factor: 1,
    afectaCosto: false,
    requiereDestino: false,
    descripcion: 'Entrada por transferencia entre bodegas',
  },
};

export interface IAplicarStockParams {
  conn: oracledb.Connection;
  idBodega: number;
  codigoArticulo: string;
  cantidad: number;
  factor: 1 | -1;
  costoUnitario?: number;
  idUbicacion?: number | null;
  idLote?: number | null;
  afectaCosto?: boolean;
}

export interface IAplicarStockResult {
  existenciaPrevia: number;
  existenciaPosterior: number;
  costoUnitarioAplicado: number;
  costoTotalAplicado: number;
  idUbicacionValida: number | null;
  idLoteValido: number | null;
}

export class InventarioCriterios {
  /**
   * Valida estrictamente si el tipo de movimiento tiene reglas operativas definidas
   */
  static validarTipoMovimiento(tipo: string): IReglaTipoMovimiento {
    const key = (tipo || '').trim().toUpperCase();
    const regla = REGLAS_TIPOS_MOVIMIENTO[key];
    if (!regla) {
      throw new Error(
        `Tipo de movimiento '${tipo}' no permitido o sin reglas operativas definidas. Tipos válidos: ${Object.keys(REGLAS_TIPOS_MOVIMIENTO).join(', ')}.`
      );
    }
    return regla;
  }

  /**
   * Verifica si existe una toma física abierta en la bodega especificada (Control de Concurrencia INV-012)
   */
  static async verificarTomaFisicaActiva(
    conn: oracledb.Connection,
    idBodega: number
  ): Promise<{ tieneTomaActiva: boolean; numeroToma?: string; idToma?: number }> {
    try {
      const sql = `
        SELECT TOM_ID_TOMA, TOM_NUMERO_TOMA
        FROM CMP_TOMA_FISICA
        WHERE TOM_ID_BODEGA = :idBodega AND TOM_ESTADO = 'ABIERTA'
        AND ROWNUM = 1
      `;
      const res = await conn.execute<any>(sql, { idBodega });
      if (res.rows && res.rows.length > 0) {
        return {
          tieneTomaActiva: true,
          idToma: Number(res.rows[0].TOM_ID_TOMA || res.rows[0][0]),
          numeroToma: String(res.rows[0].TOM_NUMERO_TOMA || res.rows[0][1]),
        };
      }
    } catch (_err) {
      // Ignorar fallos de lectura opcional
    }
    return { tieneTomaActiva: false };
  }

  /**
   * Resuelve y valida la ubicación en la bodega indicada (INV-010)
   */
  static async resolverUbicacion(
    conn: oracledb.Connection,
    idBodega: number,
    idUbicacionSolicitada?: number | null
  ): Promise<number | null> {
    if (idUbicacionSolicitada && Number(idUbicacionSolicitada) > 0) {
      const sqlCheck = `
        SELECT UBI_ID_UBICACION 
        FROM CMP_UBICACION 
        WHERE UBI_ID_UBICACION = :idUbi AND UBI_ID_BODEGA = :idBodega
      `;
      const res = await conn.execute<any>(sqlCheck, {
        idUbi: Number(idUbicacionSolicitada),
        idBodega,
      });
      if (res.rows && res.rows.length > 0) {
        return Number(idUbicacionSolicitada);
      }
    }

    // Fallback: primera ubicación activa de la bodega
    try {
      const sqlFallback = `
        SELECT UBI_ID_UBICACION 
        FROM CMP_UBICACION 
        WHERE UBI_ID_BODEGA = :idBodega
        ORDER BY UBI_ID_UBICACION ASC
      `;
      const resFallback = await conn.execute<any>(sqlFallback, { idBodega });
      if (resFallback.rows && resFallback.rows.length > 0) {
        return Number(resFallback.rows[0].UBI_ID_UBICACION || resFallback.rows[0][0]);
      }
    } catch (_err) {
      // No hay ubicaciones registradas
    }
    return null;
  }

  /**
   * Resuelve y valida el lote para el artículo si aplica (INV-010)
   */
  static async resolverLote(
    conn: oracledb.Connection,
    codigoArticulo: string,
    idLoteSolicitado?: number | null
  ): Promise<{ manejaLote: boolean; idLote: number | null }> {
    const sqlArt = `
      SELECT ART_MANEJA_LOTE 
      FROM CMP_ARTICULO 
      WHERE UPPER(TRIM(ART_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
    `;
    const resArt = await conn.execute<any>(sqlArt, { codigo: codigoArticulo });
    const manejaLote = Number(resArt.rows?.[0]?.ART_MANEJA_LOTE || resArt.rows?.[0]?.[0] || 0) === 1;

    if (!manejaLote) {
      return { manejaLote: false, idLote: null };
    }

    if (idLoteSolicitado && Number(idLoteSolicitado) > 0) {
      const sqlCheckLote = `
        SELECT LOT_ID_LOTE 
        FROM CMP_LOTE 
        WHERE LOT_ID_LOTE = :idLote AND UPPER(TRIM(LOT_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
      `;
      const resLote = await conn.execute<any>(sqlCheckLote, {
        idLote: Number(idLoteSolicitado),
        codigo: codigoArticulo,
      });
      if (resLote.rows && resLote.rows.length > 0) {
        return { manejaLote: true, idLote: Number(idLoteSolicitado) };
      }
    }

    return { manejaLote: true, idLote: null };
  }

  /**
   * Aplica actualización de stock y costo con reglas unificadas (INV-010)
   */
  static async aplicarStockConCriterios(
    params: IAplicarStockParams
  ): Promise<IAplicarStockResult> {
    const {
      conn,
      idBodega,
      codigoArticulo,
      cantidad,
      factor,
      costoUnitario = 0,
      idUbicacion,
      idLote,
      afectaCosto = true,
    } = params;

    const idUbiValida = await this.resolverUbicacion(conn, idBodega, idUbicacion);
    const { idLote: idLoteValido } = await this.resolverLote(conn, codigoArticulo, idLote);

    const sqlInv = `
      SELECT 
        INV_ID_INVENTARIO,
        INV_EXISTENCIA_ACTUAL,
        INV_STOCK_RESERVADO,
        INV_STOCK_DISPONIBLE,
        INV_COSTO_PROMEDIO_LOCAL,
        INV_ULTIMO_COSTO_COMPRA,
        INV_ID_UBICACION_DEFECTO
      FROM CMP_INVENTARIO 
      WHERE INV_ID_BODEGA = :bodega AND UPPER(TRIM(INV_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
      FOR UPDATE
    `;
    const resInv = await conn.execute<any>(sqlInv, {
      bodega: idBodega,
      codigo: codigoArticulo,
    });

    let existenciaPrevia = 0;
    let existenciaPosterior = 0;
    let costoUnitarioAplicado = costoUnitario;

    if (resInv.rows && resInv.rows.length > 0) {
      const row = resInv.rows[0];
      existenciaPrevia = Number(row.INV_EXISTENCIA_ACTUAL || 0);
      const stockReservado = Number(row.INV_STOCK_RESERVADO || 0);
      const costoPromedioActual = Number(row.INV_COSTO_PROMEDIO_LOCAL || 0);

      existenciaPosterior = existenciaPrevia + (cantidad * factor);

      if (factor === -1 && existenciaPosterior < 0) {
        throw new Error(
          `Stock insuficiente para el artículo "${codigoArticulo}" en la bodega #${idBodega}. Actualmente hay ${existenciaPrevia} unidades y se intentó descontar ${cantidad}.`
        );
      }

      if (factor === 1 && afectaCosto) {
        // Cálculo de Costo Promedio Ponderado
        const valorPrevio = existenciaPrevia * costoPromedioActual;
        const valorEntrante = cantidad * costoUnitario;
        const nuevoCostoPromedio =
          existenciaPosterior > 0 ? (valorPrevio + valorEntrante) / existenciaPosterior : costoUnitario;

        costoUnitarioAplicado = costoUnitario;

        const sqlUpdate = `
          UPDATE CMP_INVENTARIO 
          SET INV_EXISTENCIA_ACTUAL = :nueva,
              INV_STOCK_DISPONIBLE = GREATEST(0, :nueva - :reservado),
              INV_COSTO_PROMEDIO_LOCAL = ROUND(:costoProm, 4),
              INV_ULTIMO_COSTO_COMPRA = :ultimoCosto,
              INV_FECHA_ULTIMO_MOVIMIENTO = CURRENT_TIMESTAMP,
              INV_ID_UBICACION_DEFECTO = NVL(:idUbi, INV_ID_UBICACION_DEFECTO)
          WHERE INV_ID_BODEGA = :bodega AND UPPER(TRIM(INV_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
        `;
        await conn.execute(sqlUpdate, {
          nueva: existenciaPosterior,
          reservado: stockReservado,
          costoProm: nuevoCostoPromedio,
          ultimoCosto: costoUnitario,
          idUbi: idUbiValida,
          bodega: idBodega,
          codigo: codigoArticulo,
        });
      } else {
        // Salidas o movimientos que no recalculan costo promedio
        costoUnitarioAplicado = costoPromedioActual > 0 ? costoPromedioActual : costoUnitario;

        const sqlUpdate = `
          UPDATE CMP_INVENTARIO 
          SET INV_EXISTENCIA_ACTUAL = :nueva,
              INV_STOCK_DISPONIBLE = GREATEST(0, :nueva - :reservado),
              INV_FECHA_ULTIMO_MOVIMIENTO = CURRENT_TIMESTAMP
          WHERE INV_ID_BODEGA = :bodega AND UPPER(TRIM(INV_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
        `;
        await conn.execute(sqlUpdate, {
          nueva: existenciaPosterior,
          reservado: stockReservado,
          bodega: idBodega,
          codigo: codigoArticulo,
        });
      }
    } else {
      // No existe registro en inventario para esta bodega
      if (factor === -1) {
        throw new Error(
          `El artículo "${codigoArticulo}" no existe en la bodega #${idBodega} para realizar la salida.`
        );
      }

      existenciaPrevia = 0;
      existenciaPosterior = cantidad;
      costoUnitarioAplicado = costoUnitario;

      // Obtener siguiente ID para Inventario
      const sqlMaxInv = `SELECT COALESCE(MAX(INV_ID_INVENTARIO), 0) + 1 AS NEXT_INV_ID FROM CMP_INVENTARIO`;
      const resMaxInv = await conn.execute<any>(sqlMaxInv);
      const nextInvId = Number(resMaxInv.rows?.[0]?.NEXT_INV_ID || resMaxInv.rows?.[0]?.[0] || 1);

      const sqlInsertInv = `
        INSERT INTO CMP_INVENTARIO (
          INV_ID_INVENTARIO, 
          INV_ID_BODEGA, 
          INV_CODIGO_ARTICULO, 
          INV_ID_UBICACION_DEFECTO,
          INV_EXISTENCIA_ACTUAL, 
          INV_STOCK_RESERVADO,
          INV_STOCK_DISPONIBLE, 
          INV_STOCK_MINIMO,
          INV_STOCK_MAXIMO,
          INV_PUNTO_REORDEN,
          INV_COSTO_PROMEDIO_LOCAL,
          INV_ULTIMO_COSTO_COMPRA,
          INV_FECHA_ULTIMO_MOVIMIENTO
        ) VALUES (
          :idInv, 
          :bodega, 
          :codigo, 
          :idUbi,
          :cantidad, 
          0,
          :cantidad, 
          0,
          GREATEST(1000, :cantidad * 2),
          5,
          :costo,
          :costo,
          CURRENT_TIMESTAMP
        )
      `;
      await conn.execute(sqlInsertInv, {
        idInv: nextInvId,
        bodega: idBodega,
        codigo: codigoArticulo,
        idUbi: idUbiValida,
        cantidad: existenciaPosterior,
        costo: costoUnitario,
      });
    }

    return {
      existenciaPrevia,
      existenciaPosterior,
      costoUnitarioAplicado,
      costoTotalAplicado: +(existenciaPosterior * costoUnitarioAplicado).toFixed(2),
      idUbicacionValida: idUbiValida,
      idLoteValido: idLoteValido,
    };
  }
}
