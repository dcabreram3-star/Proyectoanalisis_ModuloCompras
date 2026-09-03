// Helper compartido para ejecutar sentencias SQL contra Oracle
// usando el pool de conexiones ya inicializado.
import oracledb from 'oracledb';
import { getPool } from '../config/database';

/**
 * Ejecuta una query SQL (SELECT, INSERT, UPDATE, DELETE) reutilizando
 * el pool de conexiones. Cierra la conexión automáticamente al terminar.
 *
 * @param sql      Sentencia SQL con bind variables (:nombre)
 * @param binds    Objeto con los valores para los bind variables
 * @param options  Opciones extra de oracledb.execute (ej. autoCommit)
 */
export async function runQuery<T = any>(
  sql: string,
  binds: oracledb.BindParameters = {},
  options: oracledb.ExecuteOptions = {}
): Promise<oracledb.Result<T>> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const result = await connection.execute<T>(sql, binds, {
      autoCommit: true, // Para un CRUD clásico, confirmamos cada operación de una vez
      ...options,
    });
    return result;
  } finally {
    // Pase lo que pase (éxito o error), la conexión siempre se libera de vuelta al pool
    await connection.close();
  }

}

/**
 * Ejecuta varias sentencias SQL como UNA sola transacción (todo o nada).
 * Útil para operaciones que insertan un encabezado + varias líneas de detalle
 * (por ejemplo, una Recepción de Bodega), donde si algo falla a la mitad,
 * no queremos que quede información a medias en la base de datos.
 *
 * El callback recibe la conexión ya abierta; usa connection.execute(...)
 * dentro de él con autoCommit en false (por defecto). Al terminar sin errores,
 * se hace commit una sola vez; si algo lanza un error, se hace rollback completo.
 */
export async function runTransaction<T>(
  fn: (connection: oracledb.Connection) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const resultado = await fn(connection);
    await connection.commit();
    return resultado;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}
