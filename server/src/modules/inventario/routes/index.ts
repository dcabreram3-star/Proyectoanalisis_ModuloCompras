// server/src/modules/inventario/routes/index.ts
import { Router } from 'express';
import articuloRoutes from './articulo.routes.js';
import movimientoInventarioRoutes from './movimientoInventario.routes.js';
import tomaFisicaRoutes from './tomaFisica.routes.js';
import categoriaRoutes from './categoria.routes.js';
import marcaRoutes from './marca.routes.js';

const router = Router();

// Rutas del módulo de inventario
router.use('/articulos', articuloRoutes);
router.use('/movimientos', movimientoInventarioRoutes);
router.use('/toma-fisica', tomaFisicaRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/marcas', marcaRoutes);

export default router;
