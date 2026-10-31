import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  DollarSign,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Button, StatCard, DataTable, Pagination } from '../../../components/ui';
import { SolicitudCompraClientService } from '../services/solicitudCompraClientService';
import { ISolicitudCompra } from '@erp/contracts';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  isStatusFullyComplete,
  isStatusRejected,
} from './PipelineProgress';

export interface HistorialComprasViewProps {
  onVerDetalle: (solicitud: ISolicitudCompra) => void;
}

export const HistorialComprasView: React.FC<HistorialComprasViewProps> = ({ onVerDetalle }) => {
  const [solicitudes, setSolicitudes] = useState<ISolicitudCompra[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTipo, setFilterTipo] = useState<'TODOS' | 'FINALIZADAS' | 'RECHAZADAS'>('TODOS');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Consultar solicitudes desde la API con el filtro de historial
      const data = await SolicitudCompraClientService.getSolicitudes({ soloHistorial: true });
      // Salvaguarda cliente: asegurar que únicamente se incluyan las solicitudes finalizadas o rechazadas
      const soloHistorial = data.filter((s) => {
        const isComplete = isStatusFullyComplete(s.solNombreEstado, s.solNotas);
        const isRej = isStatusRejected(s.solNombreEstado, s.solNotas);
        return isComplete || isRej;
      });
      setSolicitudes(soloHistorial);
    } catch (error: any) {
      console.error('[HistorialComprasView]: Error al cargar historial de solicitudes:', error);
      setErrorMsg(error.message || 'Error al conectar con la base de datos para obtener el historial.');
      setSolicitudes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered dataset
  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter((item) => {
      const isComplete = isStatusFullyComplete(item.solNombreEstado, item.solNotas);
      const isRej = isStatusRejected(item.solNombreEstado, item.solNotas);

      // Filtro por tipo de resultado
      if (filterTipo === 'FINALIZADAS' && !isComplete) return false;
      if (filterTipo === 'RECHAZADAS' && !isRej) return false;

      // Filtro por búsqueda de texto
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchDoc = item.solNoDocumento.toLowerCase().includes(q);
      const matchResp = (item.solNombreResponsable || '').toLowerCase().includes(q);
      const matchDep = (item.solNombreDepartamento || '').toLowerCase().includes(q);
      const matchNotas = (item.solNotas || '').toLowerCase().includes(q);

      return matchDoc || matchResp || matchDep || matchNotas;
    });
  }, [solicitudes, searchQuery, filterTipo]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredSolicitudes.length / itemsPerPage) || 1;
  const paginatedSolicitudes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSolicitudes.slice(start, start + itemsPerPage);
  }, [filteredSolicitudes, currentPage, itemsPerPage]);

  // KPIs
  const totalCount = solicitudes.length;
  const finalizadasCount = solicitudes.filter((s) =>
    isStatusFullyComplete(s.solNombreEstado, s.solNotas)
  ).length;
  const rechazadasCount = solicitudes.filter((s) =>
    isStatusRejected(s.solNombreEstado, s.solNotas)
  ).length;
  const totalMontoHistorico = solicitudes.reduce(
    (acc, curr) => acc + (curr.solMontoTotalEstimado || 0),
    0
  );

  return (
    <div data-testid="historial-compras-view" className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <History className="text-purple-600" size={28} />
            Historial de Solicitudes de Compra
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro histórico, trazabilidad de auditoría y archivo de expedientes finalizados y solicitudes rechazadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={loadData}
            disabled={isLoading}
            className="cursor-pointer"
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total en Historial"
          value={totalCount}
          icon={History}
          change={`${finalizadasCount} cerradas`}
          changeLabel="de forma exitosa"
          isPositive={true}
        />
        <StatCard
          title="Finalizadas / Liquidadas"
          value={finalizadasCount}
          icon={FileCheck}
          change="3-Way Match"
          changeLabel="conciliación OK"
          isPositive={true}
        />
        <StatCard
          title="Rechazadas / Denegadas"
          value={rechazadasCount}
          icon={ShieldAlert}
          change={`${rechazadasCount} denegadas`}
          changeLabel="con motivo en auditoría"
          isPositive={false}
        />
        <StatCard
          title="Monto Histórico Acumulado"
          value={formatCurrency(totalMontoHistorico)}
          icon={DollarSign}
        />
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            data-testid="input-buscar-historial"
            type="text"
            placeholder="Buscar por correlativo SOL-YYYY-XXXX, departamento, solicitante o motivo..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
            <Filter size={14} className="text-slate-400" />
            <span className="font-semibold text-slate-700">Resultado:</span>
            <select
              data-testid="select-filtro-tipo-historial"
              value={filterTipo}
              onChange={(e) => {
                setFilterTipo(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="TODOS">Todos ({totalCount})</option>
              <option value="FINALIZADAS">Finalizadas ({finalizadasCount})</option>
              <option value="RECHAZADAS">Rechazadas ({rechazadasCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw size={32} className="animate-spin text-purple-600" />
            <p className="text-sm font-medium">Cargando expedientes del historial de compras...</p>
          </div>
        ) : filteredSolicitudes.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <History size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700">No se encontraron expedientes en el historial</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || filterTipo !== 'TODOS'
                ? 'Ninguna solicitud coincide con los criterios de búsqueda aplicados.'
                : 'Aún no existen solicitudes que hayan culminado el ciclo completo o hayan sido rechazadas.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Documento</th>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Departamento & Solicitante</th>
                  <th className="py-3.5 px-4 text-right">Monto Total</th>
                  <th className="py-3.5 px-4 text-center">Resultado</th>
                  <th className="py-3.5 px-4">Notas / Dictamen</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSolicitudes.map((item) => {
                  const isComplete = isStatusFullyComplete(item.solNombreEstado, item.solNotas);
                  const isRej = isStatusRejected(item.solNombreEstado, item.solNotas);

                  return (
                    <tr
                      key={item.solNoDocumento}
                      className="hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {item.solNoDocumento}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(item.solFecha)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {item.solNombreDepartamento || `Depto #${item.solIdDepartamento}`}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.solNombreResponsable || `Usuario #${item.solIdUsuarioResponsable}`}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(item.solMontoTotalEstimado || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isComplete ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            FINALIZADA
                          </span>
                        ) : isRej ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle size={13} className="text-rose-600" />
                            RECHAZADA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            CERRADA
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-500 text-[11px]" title={item.solNotas || ''}>
                        {item.solNotas || 'Sin observaciones'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          data-testid="btn-ver-detalle-historial"
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => onVerDetalle(item)}
                          className="text-xs font-semibold hover:border-purple-300 hover:text-purple-700 cursor-pointer"
                        >
                          Ver Detalle
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && filteredSolicitudes.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              showingText={`Mostrando ${Math.min(
                (currentPage - 1) * itemsPerPage + 1,
                filteredSolicitudes.length
              )}-${Math.min(currentPage * itemsPerPage, filteredSolicitudes.length)} de ${
                filteredSolicitudes.length
              } registros históricos`}
            />
          </div>
        )}
      </div>
    </div>
  );
};
