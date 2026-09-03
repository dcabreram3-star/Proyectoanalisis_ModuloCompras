// Endpoints auxiliares de Orden de Compra, usados por el módulo de Recepciones
// para saber qué falta por recibir de una PO. (La CRUD completa de Órdenes de
// Compra como tal es responsabilidad de otro integrante del equipo).
import { Router } from 'express';
import * as recepcionController from '../controllers/recepcion.controller';

const router = Router();

router.get('/:noPo/detalle-para-recepcion', recepcionController.obtenerDetalleParaRecepcion);

export default router;