// Repositorio del Catálogo de Estados (tabla CMP_ESTADO)
// Aquí y solo aquí van las sentencias SQL de este catálogo.
import oracledb from 'oracledb';
import { runQuery } from '../../../shared/database.helper';
import { Estado, EstadoInput } from '../types/estado.types';

export async function findAll(): Promise<Estado[]> {
  const result = await runQuery<Estado>(
    `SELECT EST_ID_ESTADO, EST_NOMBRE_ESTADO
       FROM CMP_ESTADO
      ORDER BY EST_ID_ESTADO`
  );
  return result.rows ?? [];
}

export async function findById(id: number): Promise<Estado | null> {
  const result = await runQuery<Estado>(
    `SELECT EST_ID_ESTADO, EST_NOMBRE_ESTADO
       FROM CMP_ESTADO
      WHERE EST_ID_ESTADO = :id`,
    { id }
  );
  return result.rows && result.rows.length > 0 ? result.rows[0] : null;
}

export async function create(data: EstadoInput): Promise<number> {
  const result = await runQuery(
    `INSERT INTO CMP_ESTADO (EST_NOMBRE_ESTADO)
     VALUES (:nombre)
     RETURNING EST_ID_ESTADO INTO :id`,
    {
      nombre: data.nombreEstado,
      id: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_NUMBER },
    }
  );
  const outBinds = result.outBinds as { id: number[] };
  return outBinds.id[0];
}

export async function update(id: number, data: EstadoInput): Promise<number> {
  const result = await runQuery(
    `UPDATE CMP_ESTADO
        SET EST_NOMBRE_ESTADO = :nombre
      WHERE EST_ID_ESTADO = :id`,
    { nombre: data.nombreEstado, id }
  );
  return result.rowsAffected ?? 0;
}

export async function remove(id: number): Promise<number> {
  const result = await runQuery(
    `DELETE FROM CMP_ESTADO WHERE EST_ID_ESTADO = :id`,
    { id }
  );
  return result.rowsAffected ?? 0;
}
