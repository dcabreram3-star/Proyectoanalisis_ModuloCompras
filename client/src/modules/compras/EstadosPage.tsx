import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import { useToast, useConfirm } from '../../shared/Notifications';
import { Estado } from './types';

export default function EstadosPage() {
  const mostrarToast = useToast();
  const confirmar = useConfirm();

  const [estados, setEstados] = useState<Estado[]>([]);
  const [cargando, setCargando] = useState(true);

  // Campos del formulario (el mismo formulario sirve para Crear y para Editar)
  const [nombreEstado, setNombreEstado] = useState('');
  const [idEnEdicion, setIdEnEdicion] = useState<number | null>(null);

  async function cargarEstados() {
    setCargando(true);
    try {
      const data = await api.get('/compras/estados');
      setEstados(data);
    } catch (err: any) {
      mostrarToast('error', err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarEstados();
  }, []);

  function limpiarFormulario() {
    setNombreEstado('');
    setIdEnEdicion(null);
  }

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nombreEstado.trim()) {
      mostrarToast('error', 'El nombre del estado es obligatorio');
      return;
    }

    try {
      if (idEnEdicion === null) {
        // Modo CREAR
        await api.post('/compras/estados', { nombreEstado });
        mostrarToast('success', 'Estado creado correctamente');
      } else {
        // Modo EDITAR
        await api.put(`/compras/estados/${idEnEdicion}`, { nombreEstado });
        mostrarToast('success', 'Estado actualizado correctamente');
      }
      limpiarFormulario();
      await cargarEstados();
    } catch (err: any) {
      mostrarToast('error', err.message);
    }
  }

  function iniciarEdicion(estado: Estado) {
    setIdEnEdicion(estado.EST_ID_ESTADO);
    setNombreEstado(estado.EST_NOMBRE_ESTADO);
  }

  async function eliminarEstado(id: number) {
    const confirmado = await confirmar('¿Seguro que deseas eliminar este estado?');
    if (!confirmado) return;

    try {
      await api.delete(`/compras/estados/${id}`);
      mostrarToast('success', 'Estado eliminado correctamente');
      await cargarEstados();
    } catch (err: any) {
      mostrarToast('error', err.message);
    }
  }

  return (
    <div>
      {/* Tarjeta: Formulario de Crear / Editar */}
      <div className="card">
        <div className="card-header">
          <span className="card-header-bar" />
          <span className="card-header-title">
            {idEnEdicion === null ? 'Nuevo Estado' : `Editando Estado #${idEnEdicion}`}
          </span>
        </div>
        <div className="card-body">
          <form onSubmit={manejarSubmit} className="form-row">
            <div className="form-group">
              <label>Nombre del estado</label>
              <input
                type="text"
                placeholder="Ej. Pendiente, Aprobado, Rechazado..."
                value={nombreEstado}
                onChange={(e) => setNombreEstado(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              {idEnEdicion === null ? 'Crear' : 'Guardar cambios'}
            </button>
            {idEnEdicion !== null && (
              <button type="button" onClick={limpiarFormulario} className="btn btn-secondary">
                Cancelar
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Tarjeta: Tabla de Estados registrados */}
      <div className="card">
        <div className="card-header">
          <span className="card-header-bar" />
          <span className="card-header-title">Estados Registrados</span>
        </div>

        {cargando ? (
          <div className="loading-state">Cargando...</div>
        ) : estados.length === 0 ? (
          <div className="empty-state">No hay estados registrados todavía.</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {estados.map((estado) => (
                  <tr key={estado.EST_ID_ESTADO}>
                    <td>{estado.EST_ID_ESTADO}</td>
                    <td>{estado.EST_NOMBRE_ESTADO}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => iniciarEdicion(estado)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => eliminarEstado(estado.EST_ID_ESTADO)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}