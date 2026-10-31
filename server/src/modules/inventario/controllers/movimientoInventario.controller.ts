import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { MovimientoInventarioService } from '../services/movimientoInventario.service.js';

export class MovimientoInventarioController {
  static async crear(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      const resultado = await MovimientoInventarioService.crearMovimiento(payload);
      
      res.status(201).json(resultado);
    } catch (error: any) {
      if (error instanceof ZodError) {
        const firstMessage = error.issues[0]?.message || 'Datos de movimiento inválidos';
        res.status(400).json({
          success: false,
          message: firstMessage,
          details: error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
        });
        return;
      }
      console.error('[MovimientoInventarioController] Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message || 'Error al aplicar el movimiento de inventario',
      });
    }
  }

  static async agregarExistencias(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      const idUsuarioSesion = req.auth?.sub ? Number(req.auth.sub) : undefined;
      const resultado = await MovimientoInventarioService.agregarExistencias(payload, idUsuarioSesion);

      res.status(201).json(resultado);
    } catch (error: any) {
      if (error instanceof ZodError) {
        const firstMessage = error.issues[0]?.message || 'Datos de existencias inválidos';
        res.status(400).json({
          success: false,
          message: firstMessage,
          details: error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
        });
        return;
      }
      console.error('[MovimientoInventarioController.agregarExistencias] Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message || 'Error al añadir existencias al producto',
      });
    }
  }
}

