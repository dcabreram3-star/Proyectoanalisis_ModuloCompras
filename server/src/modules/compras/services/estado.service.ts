// Lógica de negocio del Catálogo de Estados
import * as estadoRepository from '../repositories/estado.repository';
import { Estado, EstadoInput } from '../types/estado.types';

export async function listarEstados(): Promise<Estado[]> {
  return estadoRepository.findAll();
}

export async function obtenerEstado(id: number): Promise<Estado> {
  const estado = await estadoRepository.findById(id);
  if (!estado) {
    throw new Error('NOT_FOUND');
  }
  return estado;
}

export async function crearEstado(data: EstadoInput): Promise<Estado> {
  if (!data.nombreEstado || data.nombreEstado.trim().length === 0) {
    throw new Error('VALIDATION_NOMBRE_REQUERIDO');
  }

  const nuevoId = await estadoRepository.create({
    nombreEstado: data.nombreEstado.trim(),
  });
  return obtenerEstado(nuevoId);
}

export async function actualizarEstado(id: number, data: EstadoInput): Promise<Estado> {
  if (!data.nombreEstado || data.nombreEstado.trim().length === 0) {
    throw new Error('VALIDATION_NOMBRE_REQUERIDO');
  }

  const filasAfectadas = await estadoRepository.update(id, {
    nombreEstado: data.nombreEstado.trim(),
  });

  if (filasAfectadas === 0) {
    throw new Error('NOT_FOUND');
  }
  return obtenerEstado(id);
}

export async function eliminarEstado(id: number): Promise<void> {
  const filasAfectadas = await estadoRepository.remove(id);
  if (filasAfectadas === 0) {
    throw new Error('NOT_FOUND');
  }
}
