import 'dotenv/config';

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const envCorsOrigins = process.env.CORS_ORIGINS
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
// Configuración global. Nunca exportar credenciales al frontend ni imprimir
// passwords/connection strings completos en logs.
const isProduction = process.env.NODE_ENV === 'production';

// Secreto con el que se firman los access tokens. Sin él (o si es corto) el
// servidor NO arranca: un secreto débil anula toda la seguridad del login.
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length < 32) {
  throw new Error(
    '[Auth] Falta JWT_SECRET en server/.env o tiene menos de 32 caracteres. ' +
    `Genera uno con: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
  );
}

export interface OracleDbConfig {
  user: string;
  password: string;
  connectString: string;
  poolMin: number;
  poolMax: number;
  poolIncrement: number;
  poolTimeout: number;
  poolAlias: string;
}

function cleanEnvString(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').trim();
}

const oracle: OracleDbConfig = {
  user: cleanEnvString(process.env.DB_USER || process.env.NODE_ORACLEDB_USER),
  password: cleanEnvString(process.env.DB_PASSWORD || process.env.NODE_ORACLEDB_PASSWORD),
  connectString: cleanEnvString(process.env.DB_CONNECTION_STRING || process.env.NODE_ORACLEDB_CONNECTIONSTRING),
  poolMin: Number(process.env.DB_POOL_MIN) || 2,
  poolMax: Number(process.env.DB_POOL_MAX) || 10,
  poolIncrement: Number(process.env.DB_POOL_INCREMENT) || 1,
  poolTimeout: Number(process.env.DB_POOL_TIMEOUT) || 60,
  poolAlias: cleanEnvString(process.env.DB_POOL_ALIAS) || 'ERP_COMPRAS_POOL',
};

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  corsOrigins: envCorsOrigins?.length ? envCorsOrigins : defaultCorsOrigins,
  isProduction,
  auth: {
    jwtSecret,
    /** Vida del access token (minutos). */
    accessTtlMinutes: Number(process.env.ACCESS_TOKEN_MINUTES || 15),
    /** Duración máxima de una sesión (horas), aunque se use sin parar. */
    sessionMaxHours: Number(process.env.SESSION_MAX_HOURS || 10),
    /** Minutos sin actividad antes de que la sesión expire. */
    sessionIdleMinutes: Number(process.env.SESSION_IDLE_MINUTES || 30),
    maxFailedAttempts: Number(process.env.MAX_FAILED_ATTEMPTS || 5),
    lockMinutes: Number(process.env.LOCK_MINUTES || 15),
    cookieName: 'erp_rt',
    /** Secure exige HTTPS; en desarrollo (http://localhost) debe ir apagado. */
    cookieSecure: isProduction,
    /** Vida del enlace de recuperación de contraseña (minutos). */
    recoveryTtlMinutes: Number(process.env.RECOVERY_TOKEN_MINUTES || 30),
  },
  /** URL pública del cliente: se usa para armar el enlace del correo de recuperación. */
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  /** Correo saliente. Sin SMTP_HOST el servidor no envía correos (en desarrollo imprime el enlace en consola). */
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'ERP System <no-reply@localhost>',
  },
  /** Conexión Oracle (Compras/Inventario). */
  oracle,
  /** Alias que consumen CxC/Auth (mismas credenciales que `oracle`). */
  oracleConnection: {
    user: oracle.user,
    password: oracle.password,
    connectString: oracle.connectString,
  },
};
