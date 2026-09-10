// server/src/modules/inventario/routes/index.ts
import { Router } from 'express';
import articuloRoutes from './articulo.routes.js';
import movimientoInventarioRoutes from './movimientoInventario.routes.js';
import tomaFisicaRoutes from './tomaFisica.routes.js';

const router = Router();

// Todas las rutas de artículos colgarán de /articulos
router.use('/articulos', articuloRoutes);
router.use('/movimientos', movimientoInventarioRoutes);
router.use('/toma-fisica', tomaFisicaRoutes);

export default router;