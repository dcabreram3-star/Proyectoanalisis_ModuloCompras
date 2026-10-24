// server/src/modules/inventario/repositories/articulo.repository.ts
import db from '../../../config/database.js';
import type { IArticulo, IActualizarArticuloDTO, IArticuloFiltros, IArticulosPaginadosResponse } from '@erp/contracts';

export interface IEliminarArticuloResultado {
  success: boolean;
  softDeleted: boolean;
  message: string;
}

export class ArticuloRepository {
  
  // 1. Obtener todos los artículos (con soporte para paginación y filtros INV-011)
  static async obtenerTodos(
    filtros?: IArticuloFiltros
  ): Promise<IArticulo[] | IArticulosPaginadosResponse> {
    let whereClause = 'WHERE 1=1';
    const binds: Record<string, any> = {};

    if (filtros?.soloActivos || filtros?.activo === 1) {
      whereClause += ' AND A.ART_ACTIVO = 1';
    } else if (filtros?.activo !== undefined) {
      whereClause += ' AND A.ART_ACTIVO = :activo';
      binds.activo = filtros.activo;
    }

    if (filtros?.categoriaId !== undefined && filtros.categoriaId > 0) {
      whereClause += ' AND A.ART_ID_CATEGORIA = :categoriaId';
      binds.categoriaId = filtros.categoriaId;
    }

    if (filtros?.marcaId !== undefined && filtros.marcaId > 0) {
      whereClause += ' AND A.ART_ID_MARCA = :marcaId';
      binds.marcaId = filtros.marcaId;
    }

    if (filtros?.search && filtros.search.trim() !== '') {
      whereClause += ' AND (UPPER(A.ART_CODIGO_ARTICULO) LIKE :search OR UPPER(A.ART_DESCRIPCION) LIKE :search)';
      binds.search = `%${filtros.search.trim().toUpperCase()}%`;
    }

    // Si se especifica paginación (INV-011)
    const isPaginado = filtros?.page !== undefined || filtros?.limit !== undefined;

    if (isPaginado) {
      const page = Math.max(1, Number(filtros?.page || 1));
      const limit = Math.max(1, Number(filtros?.limit || 20));
      const offset = (page - 1) * limit;

      // Consulta de conteo total
      const countSql = `SELECT COUNT(*) AS TOTAL FROM CMP_ARTICULO A ${whereClause}`;
      const countRes = await db.execute<any>(countSql, binds);
      const total = Number(countRes.rows?.[0]?.TOTAL || countRes.rows?.[0]?.[0] || 0);

      // Consulta paginada
      const sqlPaginado = `
        SELECT 
          A.ART_CODIGO_ARTICULO, 
          A.ART_DESCRIPCION, 
          A.ART_ID_CATEGORIA, 
          A.ART_ID_MARCA, 
          A.ART_ID_UNIDAD_COMPRA, 
          A.ART_ID_UNIDAD_VENTA, 
          A.ART_MANEJA_LOTE, 
          A.ART_ACTIVO,
          NVL(SUM(I.INV_EXISTENCIA_ACTUAL), 0) AS STOCK_TOTAL
        FROM CMP_ARTICULO A
        LEFT JOIN CMP_INVENTARIO I ON A.ART_CODIGO_ARTICULO = I.INV_CODIGO_ARTICULO
        ${whereClause}
        GROUP BY 
          A.ART_CODIGO_ARTICULO, 
          A.ART_DESCRIPCION, 
          A.ART_ID_CATEGORIA, 
          A.ART_ID_MARCA, 
          A.ART_ID_UNIDAD_COMPRA, 
          A.ART_ID_UNIDAD_VENTA, 
          A.ART_MANEJA_LOTE, 
          A.ART_ACTIVO
        ORDER BY A.ART_DESCRIPCION ASC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `;

      const bindsPaginados = { ...binds, offset, limit };
      const resultado = await db.execute<IArticulo>(sqlPaginado, bindsPaginados);

      return {
        data: resultado.rows || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    // Consulta estándar sin paginación (Retrocompatibilidad total)
    const sql = `
      SELECT 
        A.ART_CODIGO_ARTICULO, 
        A.ART_DESCRIPCION, 
        A.ART_ID_CATEGORIA, 
        A.ART_ID_MARCA, 
        A.ART_ID_UNIDAD_COMPRA, 
        A.ART_ID_UNIDAD_VENTA, 
        A.ART_MANEJA_LOTE, 
        A.ART_ACTIVO,
        NVL(SUM(I.INV_EXISTENCIA_ACTUAL), 0) AS STOCK_TOTAL
      FROM CMP_ARTICULO A
      LEFT JOIN CMP_INVENTARIO I ON A.ART_CODIGO_ARTICULO = I.INV_CODIGO_ARTICULO
      ${whereClause}
      GROUP BY 
        A.ART_CODIGO_ARTICULO, 
        A.ART_DESCRIPCION, 
        A.ART_ID_CATEGORIA, 
        A.ART_ID_MARCA, 
        A.ART_ID_UNIDAD_COMPRA, 
        A.ART_ID_UNIDAD_VENTA, 
        A.ART_MANEJA_LOTE, 
        A.ART_ACTIVO
      ORDER BY A.ART_DESCRIPCION ASC
    `;
    const resultado = await db.execute<IArticulo>(sql, binds);
    return resultado.rows || [];
  }

  // 2. Actualizar la descripción de un artículo
  static async actualizarDescripcion(codigo: string, datos: IActualizarArticuloDTO): Promise<boolean> {
    const sql = `
      UPDATE CMP_ARTICULO 
      SET ART_DESCRIPCION = :descripcion 
      WHERE UPPER(TRIM(ART_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
    `;
    
    const binds = {
      descripcion: datos.ART_DESCRIPCION,
      codigo: codigo
    };

    const options = { autoCommit: true };
    const resultado = await db.execute(sql, binds, options);
    return (resultado.rowsAffected ?? 0) > 0;
  }

  // 3. Desactivación Lógica / Soft Delete preservando integridad histórica (INV-004)
  static async eliminar(codigo: string): Promise<IEliminarArticuloResultado> {
    // Verificar si el artículo existe
    const sqlExiste = `
      SELECT ART_CODIGO_ARTICULO, ART_ACTIVO 
      FROM CMP_ARTICULO 
      WHERE UPPER(TRIM(ART_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
    `;
    const resExiste = await db.execute<any>(sqlExiste, { codigo });
    if (!resExiste.rows || resExiste.rows.length === 0) {
      return {
        success: false,
        softDeleted: false,
        message: `El artículo "${codigo}" no existe en el catálogo.`,
      };
    }

    // Verificar si el artículo tiene registros o movimientos previos en kardex/compras (INV-004)
    const sqlVerificarHistorial = `
      SELECT 
        (SELECT COUNT(*) FROM CMP_DETALLE_MOVIMIENTO_INV WHERE UPPER(TRIM(DMI_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))) +
        (SELECT COUNT(*) FROM CMP_DETALLE_RECEPCION WHERE UPPER(TRIM(DRE_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))) +
        (SELECT COUNT(*) FROM CMP_DETALLE_ORDEN_COMPRA WHERE UPPER(TRIM(DOC_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))) +
        (SELECT COUNT(*) FROM CMP_DETALLE_SOLICITUD WHERE UPPER(TRIM(DSO_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))) +
        (SELECT COUNT(*) FROM CMP_INVENTARIO WHERE UPPER(TRIM(INV_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo)) AND INV_EXISTENCIA_ACTUAL > 0)
      AS TOTAL_MOVIMIENTOS FROM DUAL
    `;

    let totalMovimientos = 0;
    try {
      const resCheck = await db.execute<any>(sqlVerificarHistorial, { codigo });
      totalMovimientos = Number(resCheck.rows?.[0]?.TOTAL_MOVIMIENTOS || resCheck.rows?.[0]?.[0] || 0);
    } catch (_err) {
      totalMovimientos = 1; // Asumir que posee vínculos por seguridad si la consulta fallara
    }

    if (totalMovimientos > 0) {
      // Desactivación lógica (Soft Delete) para preservar la integridad histórica del kardex (INV-004)
      const sqlSoftDelete = `
        UPDATE CMP_ARTICULO 
        SET ART_ACTIVO = 0 
        WHERE UPPER(TRIM(ART_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
      `;
      const resSoft = await db.execute(sqlSoftDelete, { codigo }, { autoCommit: true });
      const exito = (resSoft.rowsAffected ?? 0) > 0;
      return {
        success: exito,
        softDeleted: true,
        message: `El artículo "${codigo}" tiene registros o movimientos previos en el kardex. Se procedió a su desactivación lógica para preservar la integridad histórica.`,
      };
    }

    // Si no tiene registros previos de ningún tipo, intentar borrado físico con fallback seguro a soft delete
    try {
      const sqlDelete = `
        DELETE FROM CMP_ARTICULO 
        WHERE UPPER(TRIM(ART_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
      `;
      const resultado = await db.execute(sqlDelete, { codigo }, { autoCommit: true });
      const exito = (resultado.rowsAffected ?? 0) > 0;
      return {
        success: exito,
        softDeleted: false,
        message: `Artículo "${codigo}" eliminado permanentemente de la base de datos (sin historial previo).`,
      };
    } catch (error: any) {
      // Si salta restricción de integridad foránea (ORA-02292), aplicar soft delete de respaldo
      if (error?.errorNum === 2292 || (error?.message && error.message.includes('ORA-02292'))) {
        const sqlFallback = `
          UPDATE CMP_ARTICULO 
          SET ART_ACTIVO = 0 
          WHERE UPPER(TRIM(ART_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
        `;
        const resFb = await db.execute(sqlFallback, { codigo }, { autoCommit: true });
        return {
          success: (resFb.rowsAffected ?? 0) > 0,
          softDeleted: true,
          message: `El artículo "${codigo}" posee registros vinculados. Fue desactivado lógicamente para preservar la integridad del sistema.`,
        };
      }
      throw error;
    }
  }

  // 3.1 Cambiar Estado Activo (Activar o Desactivar)
  static async cambiarEstado(codigo: string, activo: number): Promise<boolean> {
    const sql = `
      UPDATE CMP_ARTICULO 
      SET ART_ACTIVO = :activo 
      WHERE UPPER(TRIM(ART_CODIGO_ARTICULO)) = UPPER(TRIM(:codigo))
    `;
    
    const binds = { codigo, activo };
    const options = { autoCommit: true };

    const resultado = await db.execute(sql, binds, options);
    return (resultado.rowsAffected ?? 0) > 0;
  }

  // 4. Crear un nuevo artículo (Insert)
  static async crear(datos: any): Promise<boolean> {
    const sql = `
      INSERT INTO CMP_ARTICULO (
        ART_CODIGO_ARTICULO, ART_DESCRIPCION, ART_ID_CATEGORIA, 
        ART_ID_MARCA, ART_ID_UNIDAD_COMPRA, ART_ID_UNIDAD_VENTA, 
        ART_MANEJA_LOTE, ART_ACTIVO
      ) VALUES (
        :codigo, :descripcion, :categoria, 
        :marca, :unidadCompra, :unidadVenta, 
        :manejaLote, 1
      )
    `;
    
    const binds = {
      codigo: datos.ART_CODIGO_ARTICULO,
      descripcion: datos.ART_DESCRIPCION,
      categoria: datos.ART_ID_CATEGORIA,
      marca: datos.ART_ID_MARCA,
      unidadCompra: datos.ART_ID_UNIDAD_COMPRA,
      unidadVenta: datos.ART_ID_UNIDAD_VENTA,
      manejaLote: datos.ART_MANEJA_LOTE
    };

    const options = { autoCommit: true };
    const resultado = await db.execute(sql, binds, options);
    return (resultado.rowsAffected ?? 0) > 0;
  }

  // 5. Obtener el siguiente código secuencial disponible para ART-XXXX
  static async obtenerSiguienteCodigo(): Promise<string> {
    const sql = `
      SELECT NVL(MAX(TO_NUMBER(REGEXP_SUBSTR(ART_CODIGO_ARTICULO, '[0-9]+'))), 0) + 1 AS NEXT_NUM 
      FROM CMP_ARTICULO 
      WHERE REGEXP_LIKE(ART_CODIGO_ARTICULO, '^ART-[0-9]+')
    `;
    const resultado = await db.execute<any>(sql);
    const nextNum = Number(resultado.rows?.[0]?.NEXT_NUM || 1);
    return `ART-${String(nextNum).padStart(4, '0')}`;
  }
}

