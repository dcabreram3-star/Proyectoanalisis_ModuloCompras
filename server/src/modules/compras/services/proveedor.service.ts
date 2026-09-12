import { ProveedorRepository } from '../repositories/proveedor.repository.js';
import {
  IProveedor,
  ICreateProveedorDTO,
  IUpdateProveedorDTO,
  IProveedorFilterParams,
} from '@erp/contracts';

// Expresión regular que valida formato de NIT: ÚNICAMENTE dígitos numéricos (0-9)
const NIT_NUMERICO_REGEX = /^[0-9]+$/;

// Expresión regular que valida Nombre o Razón Social: permite letras (con tildes y eñes), números, espacios, puntos y guiones
const NOMBRE_PROVEEDOR_REGEX = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\.,\-]+$/;

// Caracteres peligrosos explícitamente bloqueados (*, /, @, <, >, =, ;, etc.)
const CARACTERES_PROHIBIDOS_REGEX = /[*\/@<>=;\\!$%#^?{}[\]~+&|`]/;

/**
 * Servicio de Negocio para el catálogo de Proveedores
 */
export class ProveedorService {
  static async obtenerProveedores(filters: IProveedorFilterParams = {}): Promise<IProveedor[]> {
    return await ProveedorRepository.findAll(filters);
  }

  static async obtenerPorId(id: number): Promise<IProveedor | null> {
    if (!id || id <= 0) {
      throw new Error('El ID del proveedor debe ser un número positivo.');
    }
    return await ProveedorRepository.findById(id);
  }

  static async crearProveedor(data: ICreateProveedorDTO): Promise<IProveedor> {
    if (!data.proNombreEntidad || data.proNombreEntidad.trim() === '') {
      throw new Error('El nombre o razón social del proveedor es obligatorio.');
    }

    const nombreTrimmed = data.proNombreEntidad.trim();
    if (nombreTrimmed.length > 150) {
      throw new Error('El nombre del proveedor no puede exceder 150 caracteres.');
    }

    if (CARACTERES_PROHIBIDOS_REGEX.test(nombreTrimmed)) {
      throw new Error('El nombre del proveedor no puede contener caracteres especiales no permitidos (*, /, @, <, >, =, etc.).');
    }

    if (!NOMBRE_PROVEEDOR_REGEX.test(nombreTrimmed)) {
      throw new Error('El nombre del proveedor contiene caracteres inválidos. Solo se permiten letras, números, espacios, puntos y guiones.');
    }

    data.proNombreEntidad = nombreTrimmed;

    if (!data.proNit || data.proNit.trim() === '') {
      throw new Error('El NIT del proveedor es estrictamente obligatorio.');
    }

    const nitTrimmed = data.proNit.trim();

    if (!NIT_NUMERICO_REGEX.test(nitTrimmed)) {
      throw new Error('El NIT debe contener exclusivamente dígitos numéricos (0-9). No se permiten letras, guiones ni caracteres especiales.');
    }

    if (nitTrimmed.length > 20) {
      throw new Error('El NIT no puede exceder 20 dígitos numéricos.');
    }

    data.proNit = nitTrimmed;

    if (data.proActivo !== undefined && ![0, 1].includes(data.proActivo)) {
      throw new Error('El campo activo solo admite valores 0 o 1.');
    }

    return await ProveedorRepository.create(data);
  }

  static async actualizarProveedor(id: number, data: IUpdateProveedorDTO): Promise<IProveedor> {
    if (!id || id <= 0) {
      throw new Error('El ID del proveedor debe ser un número positivo.');
    }

    if (data.proNombreEntidad !== undefined) {
      if (data.proNombreEntidad.trim() === '') {
        throw new Error('El nombre del proveedor no puede estar vacío.');
      }
      const nombreTrimmed = data.proNombreEntidad.trim();
      if (nombreTrimmed.length > 150) {
        throw new Error('El nombre del proveedor no puede exceder 150 caracteres.');
      }
      if (CARACTERES_PROHIBIDOS_REGEX.test(nombreTrimmed)) {
        throw new Error('El nombre del proveedor no puede contener caracteres especiales no permitidos (*, /, @, <, >, =, etc.).');
      }
      if (!NOMBRE_PROVEEDOR_REGEX.test(nombreTrimmed)) {
        throw new Error('El nombre del proveedor contiene caracteres inválidos. Solo se permiten letras, números, espacios, puntos y guiones.');
      }
      data.proNombreEntidad = nombreTrimmed;
    }

    if (data.proNit !== undefined) {
      if (!data.proNit || data.proNit.trim() === '') {
        throw new Error('El NIT del proveedor es estrictamente obligatorio y no puede estar vacío.');
      }

      const nitTrimmed = data.proNit.trim();

      if (!NIT_NUMERICO_REGEX.test(nitTrimmed)) {
        throw new Error('El NIT debe contener exclusivamente dígitos numéricos (0-9). No se permiten letras, guiones ni caracteres especiales.');
      }

      if (nitTrimmed.length > 20) {
        throw new Error('El NIT no puede exceder 20 dígitos numéricos.');
      }

      data.proNit = nitTrimmed;
    }

    if (data.proActivo !== undefined && ![0, 1].includes(data.proActivo)) {
      throw new Error('El campo activo solo admite valores 0 o 1.');
    }

    const updated = await ProveedorRepository.update(id, data);
    if (!updated) {
      throw new Error(`No se encontró el proveedor con ID ${id}.`);
    }

    return updated;
  }

  static async eliminarProveedor(id: number): Promise<{ deleted: boolean; deactivated: boolean; message: string }> {
    if (!id || id <= 0) {
      throw new Error('El ID del proveedor debe ser un número positivo.');
    }

    const result = await ProveedorRepository.delete(id);
    if (result.deactivated) {
      return {
        ...result,
        message: 'El proveedor posee cotizaciones o facturas asociadas en el sistema, por lo que fue desactivado para proteger la integridad referencial.',
      };
    }
    return {
      ...result,
      message: 'Proveedor eliminado exitosamente.',
    };
  }
}
