import { Router } from 'express';
import { MovimientoInventarioController } from '../controllers/movimientoInventario.controller.js';

const router = Router();

router.post('/agregar-existencias', MovimientoInventarioController.agregarExistencias);
router.post('/', MovimientoInventarioController.crear);

export default router;
