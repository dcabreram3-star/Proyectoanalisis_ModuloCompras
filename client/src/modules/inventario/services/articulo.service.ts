import type { IArticulo, IActualizarArticuloDTO, ICrearArticuloDTO, IArticuloFiltros, IArticulosPaginadosResponse } from '@erp/contracts';

const API_URL = '/api/inventario/articulos';

export const articuloService = {
  
  // 2. AQUÍ AGREGAMOS LA FUNCIÓN CREAR AL INICIO DEL OBJETO
  crear: async (datos: ICrearArticuloDTO): Promise<void> => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Error al crear el artículo');
    }
  },

  // Obtener artículos con soporte para filtros y paginación (INV-011)
  obtenerTodos: async (params?: IArticuloFiltros): Promise<IArticulo[]> => {
    const queryParams = new URLSearchParams();
    if (params?.soloActivos) queryParams.append('soloActivos', 'true');
    if (params?.activo !== undefined) queryParams.append('activo', String(params.activo));
    if (params?.search) queryParams.append('search', params.search);
    if (params?.categoriaId) queryParams.append('categoriaId', String(params.categoriaId));
    if (params?.marcaId) queryParams.append('marcaId', String(params.marcaId));
    const url = queryParams.toString() ? `${API_URL}?${queryParams.toString()}` : API_URL;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al cargar los artículos');
    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  },

  obtenerPaginado: async (params: IArticuloFiltros): Promise<IArticulosPaginadosResponse> => {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', String(params.page));
    if (params.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params.soloActivos) queryParams.append('soloActivos', 'true');
    if (params.activo !== undefined) queryParams.append('activo', String(params.activo));
    if (params.search) queryParams.append('search', params.search);
    if (params.categoriaId) queryParams.append('categoriaId', String(params.categoriaId));
    if (params.marcaId) queryParams.append('marcaId', String(params.marcaId));
    const response = await fetch(`${API_URL}?${queryParams.toString()}`);
    if (!response.ok) throw new Error('Error al cargar los artículos paginados');
    return response.json();
  },

  obtenerActivos: async (): Promise<IArticulo[]> => {
    return articuloService.obtenerTodos({ soloActivos: true });
  },

  obtenerSiguienteCodigo: async (): Promise<string> => {
    const response = await fetch(`${API_URL}/siguiente-codigo`);
    if (!response.ok) throw new Error('Error al obtener el siguiente código de artículo');
    const data = await response.json();
    return data.codigo;
  },

  actualizarDescripcion: async (codigo: string, datos: IActualizarArticuloDTO): Promise<void> => {
    const response = await fetch(`${API_URL}/${codigo}/descripcion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    if (!response.ok) throw new Error('Error al actualizar el artículo');
  },

  eliminar: async (codigo: string): Promise<void> => {
    const response = await fetch(`${API_URL}/${codigo}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al eliminar el artículo');
    }
  },

  cambiarEstado: async (codigo: string, activo: number): Promise<void> => {
    const response = await fetch(`${API_URL}/${codigo}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al cambiar el estado del artículo');
    }
  }
};
