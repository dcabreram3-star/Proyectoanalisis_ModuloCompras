// Endpoints del Catálogo de Estados
import { Router } from 'express';
import * as estadoController from '../controllers/estado.controller';

const router = Router();

router.get('/', estadoController.listar);
router.get('/:id', estadoController.obtener);
router.post('/', estadoController.crear);
router.put('/:id', estadoController.actualizar);
router.delete('/:id', estadoController.eliminar);

export default router;
