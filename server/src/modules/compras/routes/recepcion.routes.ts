// Endpoints del módulo de Recepciones de Bodega
import { Router } from 'express';
import * as recepcionController from '../controllers/recepcion.controller';

const router = Router();

router.get('/', recepcionController.listar);
router.get('/:noRecepcion', recepcionController.obtener);
router.post('/', recepcionController.crear);
// No hay PUT ni DELETE: una recepción ya registrada es un documento de
// auditoría y no debe modificarse ni eliminarse.

export default router;