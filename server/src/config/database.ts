// Configuración de conexión y pool de la base de datos Oracle
import oracledb from 'oracledb';
import { config } from './index';

// Hace que oracledb devuelva los resultados como objetos { COLUMNA: valor }
// en vez de arreglos posicionales. Mucho más fácil de trabajar en el resto del código.
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool: oracledb.Pool | null = null;

/**
 * Crea el pool de conexiones a Oracle. Se llama una sola vez al iniciar el servidor.
 */
export async function createPool(): Promise<oracledb.Pool> {
  if (pool) return pool;

  pool = await oracledb.createPool({
    user: config.oracleConnection.user,
    password: config.oracleConnection.password,
    connectString: config.oracleConnection.connectString,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
  });

  console.log('[Oracle DB]: Pool de conexiones creado correctamente.');
  return pool;
}

/**
 * Obtiene el pool ya creado. Lanza un error si aún no se ha inicializado
 * (es decir, si createPool() no se ha llamado todavía, normalmente en index.ts).
 */
export function getPool(): oracledb.Pool {
  if (!pool) {
    throw new Error('El pool de Oracle no ha sido inicializado. Llama a createPool() primero.');
  }
  return pool;
}

/**
 * Cierra el pool de conexiones. Útil al apagar el servidor de forma ordenada.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close(10);
    pool = null;
    console.log('[Oracle DB]: Pool de conexiones cerrado.');
  }
}
