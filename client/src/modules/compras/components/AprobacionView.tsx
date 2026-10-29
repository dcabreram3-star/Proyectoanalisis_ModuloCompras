import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  Package,
  Layers,
  FileCheck2,
  ShieldCheck,
  Ban,
  Loader2,
  X,
  Check,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { Button, StatusBadge, TextArea } from '../../../components/ui';
import { SolicitudOriginalCard, SolicitudOriginalInfo } from './SolicitudOriginalCard';
import { SolicitudCompraClientService } from '../services/solicitudCompraClientService';
import { InlineValidationCard } from './InlineValidationCard';
import { ISolicitudCompraCompleta } from '@erp/contracts';

export interface AprobacionViewProps {
  solicitud: SolicitudOriginalInfo;
  onBack: () => void;
  onSuccess?: () => void;
  onNavigateToStage?: (stageId: 'aprobacion' | 'matriz' | 'seleccion' | 'presupuesto' | 'bodega' | '3way') => void;
}

interface EditableDetalleItem {
  idDetalle: number;
  codigoArticulo: string;
  descripcion: string;
  unidad: string;
  cantidadPedida: number;
  cantidadAprobada: number;
}

export const AprobacionView: React.FC<AprobacionViewProps> = ({
  solicitud,
  onBack,
  onSuccess,
}) => {
  const [solicitudData, setSolicitudData] = useState<ISolicitudCompraCompleta | null>(null);
  const [items, setItems] = useState<EditableDetalleItem[]>([]);
  const [notasAprobacion, setNotasAprobacion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal de Rechazo
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Carga de datos de la solicitud y sus artículos desde Oracle DB
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const completa = await SolicitudCompraClientService.getSolicitudCompleta(solicitud.noDocumento);

      if (completa) {
        setSolicitudData(completa);
        setNotasAprobacion(completa.solNotas || '');

        const mappedItems: EditableDetalleItem[] = (completa.detalles || []).map((d) => ({
          idDetalle: d.dsoIdDetalleSolicitud,
          codigoArticulo: d.dsoCodigoArticulo,
          descripcion: d.artDescripcion || d.dsoCodigoArticulo,
          unidad: d.umeAbreviatura || d.umeNombreUnidad || 'UND',
          cantidadPedida: Number(d.dsoCantidadPedida || 0),
          cantidadAprobada: Number(d.dsoCantidadAprobada ?? d.dsoCantidadPedida ?? 0),
        }));

        setItems(mappedItems);
      } else {
        // Fallback a detalles directos si la ruta completa no devuelve datos
        const detalles = await SolicitudCompraClientService.getDetalles(solicitud.noDocumento);

        const mapped: EditableDetalleItem[] = detalles.map((d) => ({
          idDetalle: d.dsoIdDetalleSolicitud,
          codigoArticulo: d.dsoCodigoArticulo,
          descripcion: d.artDescripcion || d.dsoCodigoArticulo,
          unidad: d.umeAbreviatura || d.umeNombreUnidad || 'UND',
          cantidadPedida: Number(d.dsoCantidadPedida || 0),
          cantidadAprobada: Number(d.dsoCantidadAprobada ?? d.dsoCantidadPedida ?? 0),
        }));

        setItems(mapped);
      }
    } catch (err: any) {
      console.error('[AprobacionView.fetchData Error]:', err);
      setErrorMsg(err.message || 'Error al obtener los detalles de la solicitud de compra.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [solicitud.noDocumento]);

  const estadoActual = (solicitudData?.solNombreEstado || solicitud.estado || 'PENDIENTE').toUpperCase();
  const notasRaw = (solicitudData?.solNotas || '').toUpperCase();
  const isRechazada =
    estadoActual.includes('RECHAZAD') ||
    estadoActual.includes('DENEGAD') ||
    estadoActual.includes('CANCELAD') ||
    notasRaw.includes('[RECHAZADA]') ||
    notasRaw.includes('RECHAZADA');
  const isPendiente = !isRechazada && (estadoActual.includes('PENDIENTE') || estadoActual.includes('REVISION') || estadoActual.includes('SOLICITADO'));
  const isAprobada = !isRechazada && (estadoActual.includes('APROBADA') || estadoActual.includes('APROBADO'));

  // Métricas
  const totalItems = items.length;
  const totalCantidadPedida = items.reduce((acc, curr) => acc + curr.cantidadPedida, 0);
  const totalCantidadAprobada = items.reduce((acc, curr) => acc + curr.cantidadAprobada, 0);

  // Manejo de cambio en la cantidad aprobada con estricto bloqueo de negativos y límite superior
  const handleCantidadAprobadaChange = (idDetalle: number, val: number) => {
    const intVal = Number.isInteger(val) ? val : Math.trunc(val || 0);
    setItems((prev) =>
      prev.map((item) => {
        if (item.idDetalle === idDetalle) {
          const clamped = Math.max(0, Math.min(item.cantidadPedida, intVal));
          return { ...item, cantidadAprobada: clamped };
        }
        return item;
      })
    );
  };

  // Botón rápido: Aprobar todo al 100% de lo pedido
  const handleAprobarTodo = () => {
    setItems((prev) => prev.map((i) => ({ ...i, cantidadAprobada: i.cantidadPedida })));
  };

  // Botón rápido: Limpiar a 0
  const handlePonerEnCero = () => {
    setItems((prev) => prev.map((i) => ({ ...i, cantidadAprobada: 0 })));
  };

  // Guardar Cambios sin alterar el estado del pipeline
  const handleGuardarCambios = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        notas: notasAprobacion.trim() || undefined,
        detalles: items.map((i) => ({
          idDetalle: i.idDetalle,
          cantidadAprobada: i.cantidadAprobada,
        })),
      };

      const updated = await SolicitudCompraClientService.actualizarSolicitud(solicitud.noDocumento, payload);
      setSolicitudData(updated);
      setSuccessMsg('Ajustes y cantidades guardados correctamente.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar los ajustes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aprobar Solicitud
  const handleAprobarSolicitud = async () => {
    if (totalCantidadAprobada <= 0) {
      setErrorMsg('Debe autorizar al menos 1 unidad de algún artículo para aprobar la solicitud.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        notasAprobacion: notasAprobacion.trim() || undefined,
        detalles: items.map((i) => ({
          idDetalle: i.idDetalle,
          cantidadAprobada: i.cantidadAprobada,
        })),
      };

      const aprobada = await SolicitudCompraClientService.aprobarSolicitud(solicitud.noDocumento, payload);
      setSolicitudData(aprobada);
      setSuccessMsg('¡Solicitud aprobada con éxito! Ha avanzado a la etapa de Matriz de Cotizaciones.');

      setTimeout(() => {
        if (onSuccess) onSuccess();
        else onBack();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al aprobar la solicitud.');
      setIsSubmitting(false);
    }
  };

  // Rechazar Solicitud
  const handleConfirmRechazo = async () => {
    if (!motivoRechazo || motivoRechazo.trim().length < 10) {
      setRejectError('Debe ingresar un motivo justificado de al menos 10 caracteres explicativos.');
      return;
    }

    setIsSubmitting(true);
    setRejectError(null);

    try {
      const rechazada = await SolicitudCompraClientService.rechazarSolicitud(solicitud.noDocumento, {
        motivoRechazo: motivoRechazo.trim(),
      });

      setSolicitudData(rechazada);
      setIsRejectModalOpen(false);
      setSuccessMsg('La solicitud ha sido rechazada y su ciclo ha sido cerrado.');

      setTimeout(() => {
        if (onSuccess) onSuccess();
        else onBack();
      }, 1500);
    } catch (err: any) {
      setRejectError(err.message || 'Error al procesar el rechazo.');
      setIsSubmitting(false);
    }
  };

  return (
    <div data-testid="panel-aprobacion" className="space-y-6 w-full pb-16 animate-fadeIn min-w-0">
      {/* Barra de Navegación Superior Estándar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={onBack}
            disabled={isSubmitting}
            className="font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Volver a Registros
          </Button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1.5">
            <ShieldCheck size={14} />
            Etapa 1 de 6: Aprobación
          </span>
          <h1 className="text-xl font-bold text-slate-900">
            Aprobación de Solicitud de Compra
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchData}
            disabled={isLoading || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm font-semibold transition-all"
          >
            Actualizar
          </Button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Estado:</span>
            <StatusBadge status={estadoActual} size="md" />
          </div>
        </div>
      </div>

      {/* Tarjeta con Información de la Solicitud Original */}
      <SolicitudOriginalCard
        solicitud={{
          ...solicitud,
          estado: estadoActual,
        }}
      />

      {/* Alertas de Notificación */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm animate-fadeIn shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-emerald-900">Operación exitosa</p>
            <p className="text-xs text-emerald-700 mt-0.5 font-medium">{successMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Aviso si la solicitud ya no está pendiente */}
      {isAprobada && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-4 text-blue-900 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-bold">Esta solicitud ya ha sido Aprobada</p>
              <p className="text-xs text-blue-700">
                La solicitud completó su autorización y se encuentra lista para cotizaciones en la Etapa 2 (Matriz).
              </p>
            </div>
          </div>
        </div>
      )}

      {isRechazada && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-900 text-sm">
          <Ban size={20} className="text-rose-600 flex-shrink-0" />
          <div>
            <p className="font-bold">Esta solicitud se encuentra Rechazada</p>
            <p className="text-xs text-rose-700">
              El ciclo de compras ha sido detenido formalmente. La solicitud no avanzará a las etapas posteriores (Matriz, Selección, Presupuesto, Bodega o 3-Way Match).
            </p>
          </div>
        </div>
      )}

      {/* Tarjetas de Métricas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Artículos Solicitados</p>
            <p className="text-xl font-bold text-slate-800">{totalItems} líneas</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Unidades Solicitadas</p>
            <p className="text-xl font-bold text-slate-800">{totalCantidadPedida} u.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              totalCantidadAprobada === totalCantidadPedida
                ? 'bg-emerald-50 text-emerald-600'
                : totalCantidadAprobada > 0
                ? 'bg-amber-50 text-amber-600'
                : 'bg-red-50 text-red-600'
            }`}
          >
            <FileCheck2 size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Unidades a Aprobar</p>
            <p className="text-xl font-bold text-slate-800">
              {totalCantidadAprobada} u.{' '}
              <span className="text-xs font-medium text-slate-400">
                ({totalCantidadPedida > 0 ? Math.round((totalCantidadAprobada / totalCantidadPedida) * 100) : 0}%)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Artículos de la Requisición */}
      <div data-testid="tabla-articulos-aprobacion" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" />
              Detalle de Artículos y Cantidades
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isPendiente
                ? 'Revisa y ajusta las cantidades autorizadas para cada artículo antes de emitir el dictamen.'
                : 'Detalle de los artículos y cantidades registradas en la solicitud.'}
            </p>
          </div>

          {isPendiente && (
            <div className="flex items-center gap-2">
              <Button
                variant="success"
                size="sm"
                icon={Check}
                onClick={handleAprobarTodo}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm font-semibold transition-all"
              >
                Aprobar Todo (100%)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={RotateCcw}
                onClick={handlePonerEnCero}
                className="font-semibold shadow-sm transition-all"
              >
                Restablecer a 0
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-32 font-mono">Código</th>
                <th className="py-3 px-4">Descripción del Artículo</th>
                <th className="py-3 px-4 w-28 text-center">Unidad</th>
                <th className="py-3 px-4 w-32 text-right">Cant. Pedida</th>
                <th className="py-3 px-4 w-36 text-center">Cant. Aprobada</th>
                <th className="py-3 px-4 w-32 text-center">Estado Línea</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                    Cargando artículos de la solicitud...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron detalles de artículos asociados a esta solicitud.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const isTotal = item.cantidadAprobada === item.cantidadPedida && item.cantidadPedida > 0;
                  const isParcial = item.cantidadAprobada > 0 && item.cantidadAprobada < item.cantidadPedida;
                  const isCero = item.cantidadAprobada === 0;

                  return (
                    <tr key={item.idDetalle} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">{item.codigoArticulo}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-900 block">{item.descripcion}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono font-medium">
                          {item.unidad}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-700 font-mono">
                        {item.cantidadPedida}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPendiente ? (
                          <div className="flex items-center justify-center">
                            <input
                              data-testid="input-cantidad-aprobada"
                              type="number"
                              step="1"
                              min={0}
                              max={item.cantidadPedida}
                              value={item.cantidadAprobada}
                              onKeyDown={(e) => {
                                if (['e', 'E', '.', ',', '-', '+'].includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              onPaste={(e) => {
                                const text = e.clipboardData.getData('text');
                                if (!/^\d+$/.test(text)) {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => {
                                const parsed = parseInt(e.target.value, 10);
                                handleCantidadAprobadaChange(item.idDetalle, isNaN(parsed) ? 0 : parsed);
                              }}
                              className={`w-20 sm:w-24 h-8 px-2 text-center text-xs font-bold rounded-lg border outline-none font-mono transition-all ${
                                isTotal
                                  ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900 focus:ring-2 focus:ring-emerald-200'
                                  : isParcial
                                  ? 'border-amber-400 bg-amber-50/60 text-amber-900 focus:ring-2 focus:ring-amber-200'
                                  : 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-200'
                              }`}
                            />
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900 font-mono text-sm">{item.cantidadAprobada}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isTotal && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} /> Total
                          </span>
                        )}
                        {isParcial && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle size={12} /> Parcial (-{item.cantidadPedida - item.cantidadAprobada})
                          </span>
                        )}
                        {isCero && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle size={12} /> No aprobada
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                  <td colSpan={4} className="py-3 px-4 text-right uppercase text-xs text-slate-500">
                    Totales Acumulados:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm">{totalCantidadPedida}</td>
                  <td className="py-3 px-4 text-center font-mono text-sm text-blue-600">{totalCantidadAprobada}</td>
                  <td className="py-3 px-4 text-center text-xs text-slate-400 font-normal">
                    {totalItems} artículos
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Dictamen y Observaciones con Ancho Proporcional */}
      <div data-testid="dictamen-aprobador" className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="w-1 h-4 bg-indigo-600 rounded-full inline-block" />
          Dictamen y Notas del Aprobador
        </h3>
        <p className="text-xs text-slate-500">
          Registra las instrucciones, justificaciones de reducción o comentarios para el equipo de compras.
        </p>

        {isPendiente ? (
          <div className="w-full max-w-3xl space-y-1">
            <TextArea
              value={notasAprobacion}
              onChange={(e) => setNotasAprobacion(e.target.value)}
              placeholder="Ejemplo: Se autoriza la compra de los insumos según la cuota asignada para el presente trimestre..."
              rows={3}
              maxLength={500}
              className="w-full text-xs"
            />
            <div className="flex justify-end text-[11px] text-slate-400">
              <span>{notasAprobacion.length}/500 caracteres</span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium max-w-3xl">
            {notasAprobacion || 'Sin notas registradas para este dictamen.'}
          </div>
        )}
      </div>

      {/* Alerta / Validación In-situ (Visible sin necesidad de scroll) */}
      <InlineValidationCard
        error={errorMsg}
        onDismiss={() => setErrorMsg(null)}
        title="Validación de Aprobación"
      />

      {/* Barra de Acciones Estándar (Inspirado en Bodega) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={onBack}
            disabled={isSubmitting}
            className="font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Regresar a Solicitudes
          </Button>
        </div>

        {isPendiente && (
          <div className="flex items-center gap-3">
            {/* Rechazar */}
            <Button
              data-testid="btn-rechazar-solicitud"
              variant="danger"
              size="sm"
              icon={Ban}
              onClick={() => {
                setRejectError(null);
                setMotivoRechazo('');
                setIsRejectModalOpen(true);
              }}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm font-semibold transition-all"
            >
              Rechazar Solicitud
            </Button>

            {/* Guardar Ajustes */}
            <Button
              data-testid="btn-guardar-ajustes"
              variant="secondary"
              size="sm"
              icon={Save}
              onClick={handleGuardarCambios}
              disabled={isSubmitting}
              className="font-semibold shadow-sm transition-all"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Ajustes'}
            </Button>

            {/* Aprobar */}
            <Button
              data-testid="btn-aprobar-solicitud"
              variant="success"
              size="sm"
              icon={CheckCircle2}
              onClick={handleAprobarSolicitud}
              disabled={isSubmitting || totalCantidadAprobada <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm font-semibold transition-all"
            >
              {isSubmitting ? 'Aprobando...' : 'Aprobar Solicitud'}
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Rechazo */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <XCircle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Rechazar Solicitud de Compra
                  </h3>
                  <p className="text-xs text-slate-500">
                    Documento: {solicitud.noDocumento}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p>
                  Esta acción denegará formalmente la solicitud{' '}
                  <span className="font-bold">{solicitud.noDocumento}</span> y cerrará el ciclo de compras para este requerimiento.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Motivo o Justificación del Rechazo <span className="text-red-500">*</span>
                </label>
                <TextArea
                  value={motivoRechazo}
                  maxLength={300}
                  onChange={(e) => {
                    setMotivoRechazo(e.target.value);
                    setRejectError(null);
                  }}
                  placeholder="Indica el motivo del rechazo (ej. presupuesto insuficiente, solicitud duplicada, especificaciones no conformes)..."
                  rows={3}
                  className="w-full text-xs"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Mínimo 10 caracteres requeridos para auditoría</span>
                  <span className={motivoRechazo.trim().length > 0 && motivoRechazo.trim().length < 10 ? 'text-amber-600 font-bold' : ''}>
                    {motivoRechazo.length}/300 caracteres
                  </span>
                </div>
                {rejectError && (
                  <p className="text-xs font-semibold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={13} /> {rejectError}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(false)}
                  disabled={isSubmitting}
                  className="font-semibold shadow-sm transition-all"
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  onClick={handleConfirmRechazo}
                  disabled={isSubmitting || !motivoRechazo.trim()}
                  className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm font-semibold transition-all"
                >
                  {isSubmitting ? 'Rechazando...' : 'Confirmar Rechazo'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

