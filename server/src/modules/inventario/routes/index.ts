import { Router } from 'express';
import categoriaRoutes from './categoria.routes.js';
import marcaRoutes from './marca.routes.js';

const router = Router();

router.use('/categorias', categoriaRoutes);
router.use('/marcas', marcaRoutes);

export default router;
