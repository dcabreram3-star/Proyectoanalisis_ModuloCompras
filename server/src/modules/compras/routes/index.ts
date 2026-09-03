import { Router } from 'express';
import estadoRoutes from './estado.routes';
import recepcionRoutes from './recepcion.routes';
import ordenCompraRoutes from './ordenCompra.routes';

const router = Router();

// Catálogo de Estados -> /api/compras/estados
router.use('/estados', estadoRoutes);

// Recepciones de Bodega -> /api/compras/recepciones
router.use('/recepciones', recepcionRoutes);

// Helper de Órdenes de Compra (solo lectura, para armar recepciones)
// -> /api/compras/ordenes-compra/:noPo/detalle-para-recepcion
router.use('/ordenes-compra', ordenCompraRoutes);

// TODO: aquí se van a ir agregando el resto de sub-rutas de Compras
// (artículos, solicitudes, cotizaciones, órdenes de compra completas, etc.)

export default router;