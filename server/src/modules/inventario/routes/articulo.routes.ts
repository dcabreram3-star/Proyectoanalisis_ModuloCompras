// server/src/modules/inventario/routes/articulo.routes.ts
import { Router } from 'express';
import { ArticuloController } from '../controllers/articulo.controller.js';
import { MovimientoInventarioController } from '../controllers/movimientoInventario.controller.js';

const router = Router();

// Endpoint para añadir existencias a productos
router.post('/agregar-existencias', MovimientoInventarioController.agregarExistencias);
router.post('/:codigo/existencias', (req, _res, next) => {
  if (req.params.codigo && !req.body.codigoArticulo) {
    req.body.codigoArticulo = req.params.codigo;
  }
  next();
}, MovimientoInventarioController.agregarExistencias);

// Endpoint para listar todos los artículos
router.get('/', ArticuloController.obtenerTodos);

// Endpoint para obtener el siguiente código secuencial
router.get('/siguiente-codigo', ArticuloController.obtenerSiguienteCodigo);

// Endpoint para actualizar la descripción (nota que recibe el código en la URL)
router.put('/:codigo/descripcion', ArticuloController.actualizarDescripcion);

// Endpoint para eliminar lógicamente
router.delete('/:codigo', ArticuloController.eliminar);

// Endpoint para activar o desactivar
router.patch('/:codigo/estado', ArticuloController.cambiarEstado);
router.put('/:codigo/estado', ArticuloController.cambiarEstado);

// Endpoint para crear un artículo
router.post('/', ArticuloController.crear);


export default router;
