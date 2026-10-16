import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cxcRoutes from './modules/cxc/routes';
import authRoutes from './modules/auth/auth.routes';
import usuariosRoutes from './modules/usuarios/usuarios.routes';
import { blockIfPasswordChangeRequired, enforceReadOnlyRole, requireAuth } from './modules/auth/auth.middleware';
import { errorHandler, noStore, requestLogger, securityHeaders } from './middlewares';
import { initOraclePool, closeOraclePool } from './config/database';
import { config } from './config';
import { logger } from './shared/logger';
import { config } from './config/index.js';
import { initializePool, closePool, checkDatabaseHealth } from './config/database.js';
import comprasRouter from './modules/compras/routes/index.js';
import inventarioRouter from './modules/inventario/routes/index.js';

const app = express();
const PORT = config.port;

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(requestLogger);
app.use(cors({
  origin(origin, callback) {
    // Herramientas locales/server-to-server pueden no enviar Origin.
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origen no permitido por CORS'));
  },
  // La cookie de renovación viaja solo a orígenes de la lista blanca.
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Datos financieros: evitar caché de navegador/proxy en toda la API CxC.
// Login/renovación/cierre de sesión (públicas, con su propia protección).
app.use('/api/auth', noStore, authRoutes);

// Todo CxC exige sesión válida, clave ya cambiada y rol con permiso para la operación.
app.use('/api/admin/usuarios', noStore, requireAuth, blockIfPasswordChangeRequired, usuariosRoutes);
app.use('/api/cxc', noStore, requireAuth, blockIfPasswordChangeRequired, enforceReadOnlyRole, cxcRoutes);

app.use(errorHandler);

async function bootstrap() {
  try {
    await initOraclePool();

    const server = app.listen(PORT, () => {
      logger.info('server_started', { port: PORT });
    });

    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info('server_shutdown_initiated');

      server.close(async () => {
        try {
          await closeOraclePool();
        } finally {
          process.exit(0);
        }
      });
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    logger.error('server_startup_failed', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

void bootstrap();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// Ruta de salud básica y estado de la base de datos (Health Check)
app.get('/health', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.status(dbHealth.isHealthy ? 200 : 503).json({
    status: dbHealth.isHealthy ? 'OK' : 'DEGRADED',
    timestamp: new Date(),
    environment: config.nodeEnv,
    database: dbHealth,
  });
});

// Registro de módulos del sistema
app.use('/api/compras', comprasRouter);
app.use('/api/inventario', inventarioRouter);

// Manejo 404 para rutas de la API (Siempre responde JSON)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta API no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Middleware global de captura de errores para la API
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERP Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: config.nodeEnv === 'development' ? err.stack : undefined,
  });
});


const server = app.listen(PORT, async () => {
  console.log(`[ERP Server]: API base corriendo en http://localhost:${PORT}`);
  console.log(`[ERP Server]: Entorno: ${config.nodeEnv}`);

  // Intento de inicialización del pool al arrancar (opcional / no bloqueante en desarrollo sin .env)
  try {
    if (config.oracle.user && config.oracle.password && config.oracle.connectString) {
      await initializePool();
    } else {
      console.warn('[ERP Server]: Variables de conexión a Oracle no configuradas aún en .env. El pool se inicializará bajo demanda.');
    }
  } catch (error) {
    console.error('[ERP Server]: Advertencia al inicializar el pool de Oracle en arranque:', error);
  }
});

// Manejo de apagado controlado (Graceful Shutdown)
const handleGracefulShutdown = async (signal: string) => {
  console.log(`\n[ERP Server]: Señal ${signal} recibida. Cerrando servidor y conexiones...`);
  server.close(async () => {
    console.log('[ERP Server]: Servidor HTTP cerrado.');
    try {
      await closePool(5);
    } catch (err) {
      console.error('[ERP Server]: Error al cerrar el pool de conexiones:', err);
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
