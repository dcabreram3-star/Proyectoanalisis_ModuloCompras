import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  Search,
  Plus,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react';
import { Button, StatCard, DataTable, ConfirmDialog } from '../../../components/ui';
import type { IEstado, ICreateEstadoDTO, IUpdateEstadoDTO } from '@erp/contracts';
import { EstadoClientService } from '../services/estadoClientService';
import { EstadoModal } from './EstadoModal';

export const EstadosCatalogView: React.FC = () => {
  const [estados, setEstados] = useState<IEstado[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterActivo, setFilterActivo] = useState<string>('TODOS');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEstado, setEditingEstado] = useState<IEstado | null>(null);
  const [estadoToDelete, setEstadoToDelete] = useState<IEstado | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [estadoToToggle, setEstadoToToggle] = useState<{
    estado: IEstado;
    nuevoEstado: number;
    accion: string;
  } | null>(null);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await EstadoClientService.getEstados();
      setEstados(data);
    } catch (err: any) {
      console.error('[EstadosCatalogView]: Error al cargar estados:', err);
      setErrorMsg(err.message || 'Error al conectar con la base de datos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingEstado(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (estado: IEstado) => {
    setEditingEstado(estado);
    setIsModalOpen(true);
  };

  const handleSaveEstado = async (
    data: ICreateEstadoDTO | IUpdateEstadoDTO,
    id?: number
  ) => {
    if (id) {
      await EstadoClientService.updateEstado(id, data);
      setSuccessMsg('Estado actualizado exitosamente.');
    } else {
      await EstadoClientService.createEstado(data as ICreateEstadoDTO);
      setSuccessMsg('Estado registrado exitosamente.');
    }
    loadData();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleToggleActivo = (estado: IEstado) => {
    const isActivo = estado.estActivo !== 0;
    const nuevoEstado = isActivo ? 0 : 1;
    const accion = nuevoEstado === 1 ? 'activar' : 'desactivar';
    setEstadoToToggle({ estado, nuevoEstado, accion });
  };

  const handleConfirmToggle = async () => {
    if (!estadoToToggle) return;
    setIsToggling(true);
    try {
      await EstadoClientService.updateEstado(estadoToToggle.estado.estIdEstado, {
        estActivo: estadoToToggle.nuevoEstado,
      });
      setSuccessMsg(
        `Estado "${estadoToToggle.estado.estNombreEstado}" ${estadoToToggle.nuevoEstado === 1 ? 'activado' : 'desactivado'} exitosamente.`
      );
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
      setEstadoToToggle(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar estado.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDeleteEstado = (estado: IEstado) => {
    setEstadoToDelete(estado);
  };

  const handleConfirmDelete = async () => {
    if (!estadoToDelete) return;
    setIsDeleting(true);
    try {
      const res = await EstadoClientService.deleteEstado(estadoToDelete.estIdEstado);
      setSuccessMsg(res.message);
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
      setEstadoToDelete(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar el estado.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered dataset
  const filteredEstados = useMemo(() => {
    return estados.filter((e) => {
      const matchSearch =
        !searchQuery ||
        e.estNombreEstado.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(e.estIdEstado).includes(searchQuery);

      const isActivo = e.estActivo !== 0;
      const matchEstado =
        filterActivo === 'TODOS' ||
        (filterActivo === 'ACTIVOS' && isActivo) ||
        (filterActivo === 'INACTIVOS' && !isActivo);

      return matchSearch && matchEstado;
    });
  }, [estados, searchQuery, filterActivo]);

  // Metrics
  const totalCount = estados.length;
  const activosCount = estados.filter((e) => e.estActivo !== 0).length;
  const inactivosCount = totalCount - activosCount;

  const columns = [
    {
      header: 'ID',
      accessorKey: 'estIdEstado',
      cell: ({ value }: { value: number }) => (
        <span className="font-mono text-xs font-semibold text-slate-500">
          #EST-{String(value).padStart(3, '0')}
        </span>
      ),
    },
    {
      header: 'NOMBRE DEL ESTADO',
      accessorKey: 'estNombreEstado',
      cell: ({ value, row }: { value: string; row: IEstado }) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
            {value.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-slate-800 text-sm block tracking-wide">
              {value}
            </span>
            <span className="text-[11px] text-slate-400">
              Código interno: ID #{row.estIdEstado} • Catálogo Compras
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'APLICABILIDAD',
      accessorKey: 'estIdEstado',
      cell: () => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          Solicitudes / Órdenes / CXP
        </span>
      ),
    },
    {
      header: 'ESTADO',
      accessorKey: 'estActivo',
      align: 'center' as const,
      cell: ({ value }: { value?: number }) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
            value === 0
              ? 'bg-slate-100 text-slate-600 border-slate-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {value === 0 ? 'Inactivo' : 'Activo'}
        </span>
      ),
    },
    {
      header: 'ACCIONES',
      align: 'right' as const,
      cell: ({ row }: { row: IEstado }) => {
        const isActivo = row.estActivo !== 0;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Editar estado"
            >
              <Edit2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleToggleActivo(row)}
              className={`p-1.5 rounded-lg transition-colors ${
                isActivo
                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
              title={isActivo ? 'Desactivar estado' : 'Activar estado'}
            >
              <Power size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteEstado(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Eliminar estado"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 w-full pb-12 min-w-0">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Bookmark size={18} />
            </div>
            Catálogo de Estados
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de estados del ciclo de compras para solicitudes, órdenes de compra y facturas en Oracle DB
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" icon={RefreshCw} onClick={loadData} disabled={isLoading}>
            Actualizar
          </Button>
          <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Nuevo Estado
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="TOTAL ESTADOS"
          value={totalCount}
          icon={Layers}
          changeLabel="registrados en CMP_ESTADO"
        />
        <StatCard
          title="ESTADOS ACTIVOS"
          value={activosCount}
          icon={CheckCircle2}
          isPositive={true}
          changeLabel="disponibles para compras"
        />
        <StatCard
          title="ESTADOS INACTIVOS"
          value={inactivosCount}
          icon={XCircle}
          isPositive={false}
          changeLabel="bloqueados en el sistema"
        />
      </div>

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center justify-between animate-fadeIn">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 font-bold hover:underline ml-2">
            Descartar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center justify-between animate-fadeIn">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold hover:underline ml-2">
            Descartar
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o ID de estado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Estado:</span>
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterActivo('TODOS')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterActivo === 'TODOS'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setFilterActivo('ACTIVOS')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterActivo === 'ACTIVOS'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Activos ({activosCount})
            </button>
            <button
              onClick={() => setFilterActivo('INACTIVOS')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterActivo === 'INACTIVOS'
                  ? 'bg-white text-slate-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactivos ({inactivosCount})
            </button>
          </div>
        </div>
      </div>

      {/* States DataTable */}
      <DataTable
        columns={columns}
        data={filteredEstados}
        isLoading={isLoading}
        emptyText="No se encontraron estados registrados en la base de datos con los filtros seleccionados."
      />

      {/* Creation / Edition Modal */}
      <EstadoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEstado}
        estado={editingEstado}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(estadoToDelete)}
        onClose={() => setEstadoToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="¿Estás seguro de eliminar este estado?"
        itemName={estadoToDelete ? estadoToDelete.estNombreEstado : ''}
        description="Si posee solicitudes, cotizaciones, órdenes de compra o facturas asociadas no podrá ser eliminado para garantizar la integridad referencial en Oracle DB."
        confirmText="Eliminar Estado"
        isLoading={isDeleting}
      />

      {/* State Toggle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(estadoToToggle)}
        onClose={() => setEstadoToToggle(null)}
        onConfirm={handleConfirmToggle}
        title={estadoToToggle?.nuevoEstado === 1 ? '¿Deseas activar este estado?' : '¿Deseas desactivar este estado?'}
        itemName={estadoToToggle ? estadoToToggle.estado.estNombreEstado : ''}
        description={
          estadoToToggle?.nuevoEstado === 0
            ? 'No estará disponible para asignar a nuevos documentos o transacciones en el módulo de compras.'
            : 'Volverá a estar disponible para su uso en el flujo de adquisiciones y compras.'
        }
        confirmText={estadoToToggle?.nuevoEstado === 1 ? 'Activar Estado' : 'Desactivar Estado'}
        variant={estadoToToggle?.nuevoEstado === 1 ? 'primary' : 'warning'}
        isLoading={isToggling}
      />
    </div>
  );
};
