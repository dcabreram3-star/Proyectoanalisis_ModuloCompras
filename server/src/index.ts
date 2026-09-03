import express from 'express';
import cors from 'cors';
import { config } from './config';
import { createPool, closePool } from './config/database';
import { errorHandler } from './middlewares';
import comprasRoutes from './modules/compras/routes';

const app = express();
const PORT = config.port;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de salud básica (Health Check)
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Registro de módulos del sistema
app.use('/api/compras', comprasRoutes);
// TODO: Importar y usar rutas de bancos, cxp, cxc cuando estén listas

// Middleware de manejo de errores (siempre al final, después de las rutas)
app.use(errorHandler);

async function iniciarServidor() {
  try {
    await createPool();

    app.listen(PORT, () => {
      console.log(`[ERP Server]: API base corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[ERP Server]: No se pudo iniciar el servidor. Error de conexión a Oracle:', error);
    process.exit(1);
  }
}

// Cierre ordenado del pool si se detiene el servidor (Ctrl+C)
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

iniciarServidor();
