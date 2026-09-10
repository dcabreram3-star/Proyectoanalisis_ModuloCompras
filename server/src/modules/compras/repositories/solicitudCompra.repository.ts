import { execute } from '../../../config/database.js';
import { ISolicitudCompra, ISolicitudCompraFilterParams } from '@erp/contracts';

/**
 * Estructura interna de los registros devueltos por Oracle DB para CMP_SOLICITUD_COMPRA
 */
interface ISolicitudCompraDbRow {
  SOL_NO_DOCUMENTO: string;
  SOL_ID_USUARIO_RESPONSABLE: number | string;
  SOL_NOMBRE_RESPONSABLE?: string | null;
  SOL_ID_DEPARTAMENTO: number | string;
  SOL_NOMBRE_DEPARTAMENTO?: string | null;
  SOL_FECHA?: Date | string | null;
  SOL_NOTAS?: string | null;
  SOL_MONTO_TOTAL_ESTIMADO?: number | string | null;
  SOL_ID_ESTADO: number | string;
  EST_NOMBRE_ESTADO?: string | null;
}

/**
 * Mapea una fila de Oracle DB a la entidad ISolicitudCompra
 */
function mapRowToSolicitud(row: ISolicitudCompraDbRow): ISolicitudCompra {
  const deptoId = Number(row.SOL_ID_DEPARTAMENTO);
  const respId = Number(row.SOL_ID_USUARIO_RESPONSABLE);

  return {
    solNoDocumento: String(row.SOL_NO_DOCUMENTO),
    solIdUsuarioResponsable: respId,
    solNombreResponsable: row.SOL_NOMBRE_RESPONSABLE
      ? String(row.SOL_NOMBRE_RESPONSABLE)
      : `Empleado #${respId}`,
    solIdDepartamento: deptoId,
    solNombreDepartamento: row.SOL_NOMBRE_DEPARTAMENTO
      ? String(row.SOL_NOMBRE_DEPARTAMENTO)
      : `Departamento #${deptoId}`,
    solNombreEntidad: 'Módulo Compras ERP',
    solFecha: row.SOL_FECHA ? new Date(row.SOL_FECHA).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    solNotas: row.SOL_NOTAS ? String(row.SOL_NOTAS) : null,
    solMontoTotalEstimado: Number(row.SOL_MONTO_TOTAL_ESTIMADO || 0),
    solIdEstado: Number(row.SOL_ID_ESTADO),
    solNombreEstado: row.EST_NOMBRE_ESTADO ? String(row.EST_NOMBRE_ESTADO) : 'Aprobado',
  };
}

/**
 * Repositorio de Acceso a Datos para Solicitudes de Compra en Oracle DB
 */
export class SolicitudCompraRepository {
  /**
   * Consulta todas las solicitudes de compra con información vinculada de empleado, departamento y estado.
   */
  static async findAll(filters: ISolicitudCompraFilterParams = {}): Promise<ISolicitudCompra[]> {
    let sql = `
      SELECT 
        S.SOL_NO_DOCUMENTO,
        S.SOL_ID_USUARIO_RESPONSABLE,
        TRIM(NVL2(EMP.EMP_PRIMER_NOMBRE, EMP.EMP_PRIMER_NOMBRE || ' ' || NVL(EMP.EMP_PRIMER_APELLIDO, ''), NULL)) AS SOL_NOMBRE_RESPONSABLE,
        S.SOL_ID_DEPARTAMENTO,
        DEP.DEP_NOMBRE AS SOL_NOMBRE_DEPARTAMENTO,
        S.SOL_FECHA,
        S.SOL_NOTAS,
        S.SOL_MONTO_TOTAL_ESTIMADO,
        S.SOL_ID_ESTADO,
        E.EST_NOMBRE_ESTADO
      FROM CMP_SOLICITUD_COMPRA S
      LEFT JOIN CMP_ESTADO E ON S.SOL_ID_ESTADO = E.EST_ID_ESTADO
      LEFT JOIN ALP_DEPARTAMENTO DEP ON S.SOL_ID_DEPARTAMENTO = DEP.DEP_DEPARTAMENTO
      LEFT JOIN ALP_EMPLEADO EMP ON S.SOL_ID_USUARIO_RESPONSABLE = EMP.EMP_EMPLEADO
      WHERE 1=1
    `;
    const binds: Record<string, any> = {};

    if (filters.noDocumento) {
      sql += ` AND S.SOL_NO_DOCUMENTO LIKE :noDocumento`;
      binds.noDocumento = `%${filters.noDocumento}%`;
    }

    if (filters.idDepartamento) {
      sql += ` AND S.SOL_ID_DEPARTAMENTO = :idDepartamento`;
      binds.idDepartamento = filters.idDepartamento;
    }

    if (filters.idEstado) {
      sql += ` AND S.SOL_ID_ESTADO = :idEstado`;
      binds.idEstado = filters.idEstado;
    }

    sql += ` ORDER BY S.SOL_FECHA DESC, S.SOL_NO_DOCUMENTO DESC`;

    const result = await execute<ISolicitudCompraDbRow>(sql, binds);
    return (result.rows || []).map(mapRowToSolicitud);
  }

  /**
   * Obtiene una solicitud de compra por su número de documento único.
   */
  static async findByNoDocumento(noDocumento: string): Promise<ISolicitudCompra | null> {
    const sql = `
      SELECT 
        S.SOL_NO_DOCUMENTO,
        S.SOL_ID_USUARIO_RESPONSABLE,
        TRIM(NVL2(EMP.EMP_PRIMER_NOMBRE, EMP.EMP_PRIMER_NOMBRE || ' ' || NVL(EMP.EMP_PRIMER_APELLIDO, ''), NULL)) AS SOL_NOMBRE_RESPONSABLE,
        S.SOL_ID_DEPARTAMENTO,
        DEP.DEP_NOMBRE AS SOL_NOMBRE_DEPARTAMENTO,
        S.SOL_FECHA,
        S.SOL_NOTAS,
        S.SOL_MONTO_TOTAL_ESTIMADO,
        S.SOL_ID_ESTADO,
        E.EST_NOMBRE_ESTADO
      FROM CMP_SOLICITUD_COMPRA S
      LEFT JOIN CMP_ESTADO E ON S.SOL_ID_ESTADO = E.EST_ID_ESTADO
      LEFT JOIN ALP_DEPARTAMENTO DEP ON S.SOL_ID_DEPARTAMENTO = DEP.DEP_DEPARTAMENTO
      LEFT JOIN ALP_EMPLEADO EMP ON S.SOL_ID_USUARIO_RESPONSABLE = EMP.EMP_EMPLEADO
      WHERE S.SOL_NO_DOCUMENTO = :noDocumento
    `;

    const result = await execute<ISolicitudCompraDbRow>(sql, { noDocumento });
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToSolicitud(result.rows[0]);
  }

  /**
   * Crea una nueva solicitud de compra con sus detalles usando una transacción
   */
  static async create(solicitudData: import('@erp/contracts').ISolicitudCompraCreateDTO, noDocumento: string): Promise<string> {
    const { withTransaction } = await import('../../../config/database.js');

    return withTransaction(async (connection) => {
      // 1. Insertar cabecera (Estado 1 = PENDIENTE)
      const sqlCabecera = `
        INSERT INTO CMP_SOLICITUD_COMPRA (
          SOL_NO_DOCUMENTO,
          SOL_ID_USUARIO_RESPONSABLE,
          SOL_ID_DEPARTAMENTO,
          SOL_NOTAS,
          SOL_MONTO_TOTAL_ESTIMADO,
          SOL_ID_ESTADO,
          SOL_FECHA
        ) VALUES (
          :noDocumento,
          :idUsuario,
          :idDepartamento,
          :notas,
          0,
          1,
          SYSDATE
        )
      `;
      
      const bindsCabecera = {
        noDocumento,
        idUsuario: solicitudData.idUsuarioResponsable,
        idDepartamento: solicitudData.idDepartamento,
        notas: solicitudData.notas || null
      };

      await connection.execute(sqlCabecera, bindsCabecera);

      // 2. Insertar detalles
      // NOTA: Si la tabla CMP_DETALLE_SOLICITUD tiene DSO_ID_DETALLE_SOLICITUD como IDENTITY, no lo enviamos.
      // Si la base de datos requiere secuencia, ajustaremos luego. Asumimos IDENTITY o Trigger por ahora.
      const sqlDetalle = `
        INSERT INTO CMP_DETALLE_SOLICITUD (
          DSO_NO_DOCUMENTO_SOLICITUD,
          DSO_CODIGO_ARTICULO,
          DSO_CANTIDAD_PEDIDA,
          DSO_CANTIDAD_APROBADA
        ) VALUES (
          :noDocumento,
          :codigoArticulo,
          :cantidadPedida,
          0
        )
      `;

      for (const detalle of solicitudData.detalles) {
        // Manejo de artículo nuevo (ej: guardamos un código genérico "NUEVO" y usamos las notas si no hay otra columna, 
        // pero por ahora pasamos el nombreArticuloNuevo o codigoNUEVO).
        let codArticulo = detalle.codigoArticulo;
        if (detalle.isNuevo && detalle.nombreArticuloNuevo) {
           // TO-DO: Idealmente guardar en una columna DSO_DESCRIPCION_NUEVO. 
           // Como no conocemos el DDL exacto, enviamos un código especial 'NEW-ITEM'
           // y dependemos de que exista o concatenamos en las notas de la cabecera.
           codArticulo = 'NEW-ITEM'; 
        }

        const bindsDetalle = {
          noDocumento,
          codigoArticulo: codArticulo || 'UNKNOWN',
          cantidadPedida: detalle.cantidadPedida
        };

        await connection.execute(sqlDetalle, bindsDetalle);
      }

      return noDocumento;
    });
  }
}
