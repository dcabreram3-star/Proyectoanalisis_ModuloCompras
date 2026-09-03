// Controlador del Catálogo de Estados
import { Request, Response } from 'express';
import * as estadoService from '../services/estado.service';

function manejarError(error: any, res: Response) {
  if (error.message === 'NOT_FOUND') {
    return res.status(404).json({ error: 'Estado no encontrado' });
  }
  if (error.message === 'VALIDATION_NOMBRE_REQUERIDO') {
    return res.status(400).json({ error: 'El nombre del estado es obligatorio' });
  }
  console.error(error);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

export async function listar(_req: Request, res: Response) {
  try {
    const estados = await estadoService.listarEstados();
    res.json(estados);
  } catch (error) {
    manejarError(error, res);
  }
}

export async function obtener(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const estado = await estadoService.obtenerEstado(id);
    res.json(estado);
  } catch (error) {
    manejarError(error, res);
  }
}

export async function crear(req: Request, res: Response) {
  try {
    const nuevoEstado = await estadoService.crearEstado(req.body);
    res.status(201).json(nuevoEstado);
  } catch (error) {
    manejarError(error, res);
  }
}

export async function actualizar(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const estadoActualizado = await estadoService.actualizarEstado(id, req.body);
    res.json(estadoActualizado);
  } catch (error) {
    manejarError(error, res);
  }
}

export async function eliminar(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await estadoService.eliminarEstado(id);
    res.status(204).send();
  } catch (error) {
    manejarError(error, res);
  }
}
