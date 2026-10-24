import { execute } from '../../../config/database.js';

export interface IBitacoraRegistroDTO {
  idUsuario?: number | null;
  ipOrigen?: string | null;
  accion: string;
  valoresPrevios?: any;
  valoresPosteriores?: any;
}

export interface IBitacoraRow {
  BIT_ID_BITACORA: number;
  BIT_ID_USUARIO?: number | null;
  BIT_FECHA_HORA: Date | string;
  BIT_DIRECCION_IP_ORIGEN?: string | null;
  BIT_ACCION: string;
  BIT_VALORES_PREVIOS?: string | null;
  BIT_VALORES_POSTERIORES?: string | null;
}

export class BitacoraRepository {
  /**
   * Serializa un objeto de forma segura para caber en una columna VARCHAR2(4000)
   */
  private static serializePayload(val: any): string | null {
    if (val === undefined || val === null) return null;
    if (typeof val === 'string') {
      return val.length > 3990 ? val.substring(0, 3990) + '...' : val;
    }
    try {
      const json = JSON.stringify(val);
      return json.length > 3990 ? json.substring(0, 3990) + '...' : json;
    } catch (_err) {
      return String(val).substring(0, 3990);
    }
  }

  /**
   * Registra un evento inalterable de auditoría en CMP_BITACORA_AUDITORIA.
   * Admite opcionalmente una conexión transaccional existente.
   */
  static async registrar(dto: IBitacoraRegistroDTO, conn?: any): Promise<void> {
    const executor = conn || { execute };
    const sql = `
      INSERT INTO CMP_BITACORA_AUDITORIA (
        BIT_ID_USUARIO,
        BIT_FECHA_HORA,
        BIT_DIRECCION_IP_ORIGEN,
        BIT_ACCION,
        BIT_VALORES_PREVIOS,
        BIT_VALORES_POSTERIORES
      ) VALUES (
        :idUsuario,
        CURRENT_TIMESTAMP,
        :ipOrigen,
        :accion,
        :valoresPrevios,
        :valoresPosteriores
      )
    `;

    const binds = {
      idUsuario: dto.idUsuario ?? null,
      ipOrigen: (dto.ipOrigen || '127.0.0.1').substring(0, 50),
      accion: dto.accion.substring(0, 100),
      valoresPrevios: this.serializePayload(dto.valoresPrevios),
      valoresPosteriores: this.serializePayload(dto.valoresPosteriores),
    };

    try {
      if (conn) {
        await conn.execute(sql, binds);
      } else {
        await execute(sql, binds, { autoCommit: true });
      }
    } catch (err) {
      console.error('[BitacoraRepository.registrar Error]: No se pudo escribir en CMP_BITACORA_AUDITORIA:', err);
      throw err;
    }
  }

  /**
   * Consulta los últimos registros de auditoría
   */
  static async findRecientes(limite: number = 50): Promise<IBitacoraRow[]> {
    const sql = `
      SELECT 
        BIT_ID_BITACORA,
        BIT_ID_USUARIO,
        BIT_FECHA_HORA,
        BIT_DIRECCION_IP_ORIGEN,
        BIT_ACCION,
        BIT_VALORES_PREVIOS,
        BIT_VALORES_POSTERIORES
      FROM CMP_BITACORA_AUDITORIA
      ORDER BY BIT_ID_BITACORA DESC
      FETCH FIRST :limite ROWS ONLY
    `;
    const res = await execute<IBitacoraRow>(sql, { limite });
    return res.rows || [];
  }
}
