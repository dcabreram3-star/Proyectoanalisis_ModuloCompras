import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cxcRoutes from './modules/cxc/routes';
import authRoutes from './modules/auth/auth.routes';
import usuariosRoutes from './modules/usuarios/usuarios.routes';
import comprasRouter from './modules/compras/routes/index.js';
import inventarioRouter from './modules/inventario/routes/index.js';
import { blockIfPasswordChangeRequired, enforceReadOnlyRole, requireAuth } from './modules/auth/auth.middleware';
import { errorHandler, noStore, requestLogger, securityHeaders } from './middlewares';
import { initializePool, closePool, checkDatabaseHealth } from './config/database';
import { config } from './config';
import { logger } from './shared/logger';

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
  // Compras/Inventario usan PUT.
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compras/Inventario envían archivos en base64 (cotizaciones): límite propio de 50mb
// SOLO para esos routers, montados antes del parser global de 1mb.
const largeBodyParsers = [
  express.json({ limit: '50mb' }),
  express.urlencoded({ extended: true, limit: '50mb' }),
];
app.use('/api/compras', ...largeBodyParsers, comprasRouter);
app.use('/api/inventario', ...largeBodyParsers, inventarioRouter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Health check con estado de la base de datos.
app.get('/health', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.status(dbHealth.isHealthy ? 200 : 503).json({
    status: dbHealth.isHealthy ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: dbHealth,
  });
});

// Login/renovación/cierre de sesión (públicas, con su propia protección).
app.use('/api/auth', noStore, authRoutes);

// Datos financieros: evitar caché de navegador/proxy y exigir sesión válida,
// clave ya cambiada y rol con permiso para la operación.
app.use('/api/admin/usuarios', noStore, requireAuth, blockIfPasswordChangeRequired, usuariosRoutes);
app.use('/api/cxc', noStore, requireAuth, blockIfPasswordChangeRequired, enforceReadOnlyRole, cxcRoutes);

// 404 JSON para rutas de API desconocidas.
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta API no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

async function bootstrap() {
  try {
    await initializePool();

    const server = app.listen(PORT, () => {
      logger.info('server_started', { port: PORT, environment: config.nodeEnv });
    });

    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info('server_shutdown_initiated');

      server.close(async () => {
        try {
          await closePool(10);
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
