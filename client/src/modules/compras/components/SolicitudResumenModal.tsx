import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Building2,
  Package,
  Warehouse,
  Receipt,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  FileSpreadsheet,
  Award,
  Wallet,
  ScrollText,
  UserCheck,
  Loader2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import {
  ISolicitudCompra,
  ISolicitudCompraCompleta,
  IThreeWayMatchData,
} from '@erp/contracts';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { SolicitudCompraClientService } from '../services/solicitudCompraClientService';
import { ThreeWayMatchClientService } from '../services/threeWayMatchClientService';
import {
  PipelineStageId,
  PIPELINE_STAGES,
  getStageForSolicitud,
  isStatusRejected,
  isStatusFullyComplete,
} from './PipelineProgress';

export interface SolicitudResumenModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitud: ISolicitudCompra | null;
  onNavigateToStage?: (stageKey: PipelineStageId, solicitud: ISolicitudCompra) => void;
}

export const SolicitudResumenModal: React.FC<SolicitudResumenModalProps> = ({
  isOpen,
  onClose,
  solicitud,
  onNavigateToStage,
}) => {
  const [solicitudCompleta, setSolicitudCompleta] = useState<ISolicitudCompraCompleta | null>(null);
  const [matchData, setMatchData] = useState<IThreeWayMatchData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'general' | 'articulos' | 'etapa'>('general');

  useEffect(() => {
    if (!isOpen || !solicitud) {
      setSolicitudCompleta(null);
      setMatchData(null);
      return;
    }

    setIsLoading(true);

    // Cargar datos completos de la solicitud y del match de compras en paralelo
    Promise.all([
      SolicitudCompraClientService.getSolicitudCompleta(solicitud.solNoDocumento).catch((err) => {
        console.warn('[SolicitudResumenModal]: Error al cargar detalles de solicitud:', err);
        return null;
      }),
      ThreeWayMatchClientService.getThreeWayMatchData(solicitud.solNoDocumento).catch((err) => {
        console.warn('[SolicitudResumenModal]: Error al cargar datos de 3-way match:', err);
        return null;
      }),
    ])
      .then(([solComp, match]) => {
        if (solComp) setSolicitudCompleta(solComp);
        if (match) setMatchData(match);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, solicitud?.solNoDocumento]);

  if (!isOpen || !solicitud) return null;

  const currentStage = getStageForSolicitud(solicitud);
  const isRej = isStatusRejected(solicitud.solNombreEstado, solicitud.solNotas);
  const isComplete = isStatusFullyComplete(solicitud.solNombreEstado, solicitud.solNotas);

  // Mapear nombres y metadatos de las etapas
  const stageMeta: Record<
    PipelineStageId,
    { label: string; stepNumber: number; icon: React.ComponentType<any>; color: string; bg: string; border: string }
  > = {
    aprobacion: {
      label: 'Aprobación Inicial',
      stepNumber: 1,
      icon: ShieldCheck,
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
    },
    matriz: {
      label: 'Matriz de Cotizaciones',
      stepNumber: 2,
      icon: FileSpreadsheet,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    seleccion: {
      label: 'Selección & Adjudicación',
      stepNumber: 3,
      icon: Award,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    presupuesto: {
      label: 'Presupuesto & Orden de Compra',
      stepNumber: 4,
      icon: Wallet,
      color: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    },
    bodega: {
      label: 'Recepción en Bodega',
      stepNumber: 5,
      icon: Warehouse,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    '3way': {
      label: '3-Way Match & Liquidación',
      stepNumber: 6,
      icon: ScrollText,
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
    },
    rechazada: {
      label: 'Solicitud Rechazada',
      stepNumber: 0,
      icon: Ban,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
    },
  };

  const meta = stageMeta[currentStage] || stageMeta.aprobacion;
  const StageIcon = meta.icon;

  const detallesArticulos = solicitudCompleta?.detalles || [];
  const ordenCompra = matchData?.ordenCompra;
  const cotizacion = matchData?.cotizacion;
  const recepcionBodega = matchData?.recepcionBodega;
  const facturaExistente = matchData?.facturaExistente;

  // Manejar click para ir a la etapa
  const handleGoToStage = () => {
    onClose();
    if (onNavigateToStage) {
      const targetStage = currentStage === 'rechazada' ? 'aprobacion' : currentStage;
      onNavigateToStage(targetStage, solicitud);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        {/* HEADER CORPORATIVO */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0 border ${meta.border} shadow-2xs`}>
              <StageIcon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Resumen de Compra: <span className="font-mono text-blue-700">{solicitud.solNoDocumento}</span>
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isRej
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : isComplete
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : `${meta.bg} ${meta.color} ${meta.border}`
                  }`}
                >
                  {isRej ? 'RECHAZADA' : isComplete ? 'CICLO CONCLUIDO' : meta.label.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Departamento: <span className="font-semibold text-slate-800">{solicitud.solNombreDepartamento || `Depto. #${solicitud.solIdDepartamento}`}</span>
                {' · '}
                Solicitante: <span className="font-semibold text-slate-800">{solicitud.solNombreResponsable || `Usuario #${solicitud.solIdUsuarioResponsable}`}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* PIPELINE PROGRESS BAR COMPACTO */}
        <div className="px-6 py-3 bg-slate-100/60 border-b border-slate-200/80 overflow-x-auto">
          <div className="flex items-center justify-between gap-1 min-w-[580px]">
            {PIPELINE_STAGES.map((stg, idx) => {
              const stepNum = idx + 1;
              const isPast = !isRej && (isComplete || (meta.stepNumber > stepNum));
              const isCurrent = !isRej && meta.stepNumber === stepNum;
              const isFuture = !isRej && meta.stepNumber < stepNum;

              return (
                <React.Fragment key={stg.key}>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isPast
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90'
                        : isCurrent
                        ? `${meta.bg} ${meta.color} border ${meta.border} font-bold shadow-2xs`
                        : isRej
                        ? 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-60'
                        : 'bg-white text-slate-400 border border-slate-200/70'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isPast
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPast ? '✓' : stepNum}
                    </span>
                    <span className="truncate">{stg.label}</span>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 min-w-[12px] ${
                        isPast ? 'bg-emerald-400' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* BANNER DE ALERTA SI ESTÁ RECHAZADA */}
        {isRej && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-3 shadow-2xs">
            <Ban size={20} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-rose-950">
                Esta solicitud fue formalmente rechazada y el ciclo de compra se encuentra detenido.
              </p>
              <p className="text-rose-800 text-[11px] leading-relaxed">
                Motivo / Justificación registrada:{' '}
                <span className="font-semibold text-rose-950">
                  {solicitud.solNotas || 'Sin notas registradas'}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* BODY CON SCROLL */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <p className="font-medium text-xs">Consultando trazabilidad integral en Oracle Database...</p>
            </div>
          ) : (
            <>
              {/* 1. TARJETAS DE MÉTRICAS CLAVE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Monto Estimado Inicial
                  </span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    {formatCurrency(solicitud.solMontoTotalEstimado || 0)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">En Solicitud</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Monto Autorizado / PO
                  </span>
                  <span className="text-base font-extrabold text-emerald-700 font-mono">
                    {ordenCompra
                      ? formatCurrency(ordenCompra.ocoTotal)
                      : cotizacion
                      ? formatCurrency(cotizacion.cotPrecioTotal)
                      : 'Pendiente'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {ordenCompra ? `PO: ${ordenCompra.ocoNoPo}` : cotizacion ? 'Cotización Ganadora' : 'Sin PO emitida'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Fecha de Creación
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatDate(solicitud.solFecha, '2026-03-01')}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Fecha oficial</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Entidad Corporativa
                  </span>
                  <span className="text-sm font-bold text-slate-800 truncate block">
                    {solicitud.solNombreEntidad || 'Empresa Principal'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Institución</span>
                </div>
              </div>

              {/* 2. SECCIÓN DINÁMICA POR ETAPAS */}
              <div className="space-y-4">
                {/* ── BLOQUE A: ARTÍCULOS DE LA SOLICITUD ORIGINAL ── */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                      <Package size={16} className="text-blue-600" />
                      <span>Artículos Solicitados ({detallesArticulos.length})</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Requerimiento original de compra
                    </span>
                  </div>

                  {detallesArticulos.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">CÓDIGO</th>
                            <th className="px-3 py-2">DESCRIPCIÓN</th>
                            <th className="px-3 py-2 text-center">UNIDAD</th>
                            <th className="px-3 py-2 text-center">CANT. PEDIDA</th>
                            <th className="px-3 py-2 text-center">CANT. APROBADA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detallesArticulos.map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">
                                {it.dsoCodigoArticulo}
                              </td>
                              <td className="px-3 py-2 text-slate-700 font-medium">
                                {it.artDescripcion || it.dsoCodigoArticulo}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-500">
                                {it.umeAbreviatura || it.umeNombreUnidad || 'UND'}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-slate-900">
                                {it.dsoCantidadPedida}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-emerald-700">
                                {it.dsoCantidadAprobada ?? it.dsoCantidadPedida}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No se encontraron líneas de detalle registradas en la solicitud.
                    </div>
                  )}

                  {solicitud.solNotas && (
                    <div className="p-3 bg-slate-50 border-t border-slate-100 text-slate-600 text-[11px] flex items-start gap-2">
                      <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800">Notas de la solicitud: </span>
                        <span>{solicitud.solNotas}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── BLOQUE B: COTIZACIÓN ADJUDICADA (SI LLEGÓ A ETAPA 3 EN ADELANTE) ── */}
                {cotizacion && (
                  <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-2xs">
                    <div className="px-4 py-3 bg-emerald-50/60 border-b border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs">
                        <Award size={16} className="text-emerald-600" />
                        <span>Cotización Oficial Adjudicada (Proveedor Ganador)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {cotizacion.cotEstadoAdjudicacion || 'ADJUDICADA'}
                      </span>
                    </div>

                    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/20">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Proveedor Adjudicado:</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {cotizacion.cotNombreProveedor || `Proveedor #${cotizacion.cotIdProveedor}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Tiempo de Entrega:</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {cotizacion.cotTiempoEntregaDias ? `${cotizacion.cotTiempoEntregaDias} días hábiles` : 'Inmediata'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Monto Cotizado:</span>
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          {formatCurrency(cotizacion.cotPrecioTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── BLOQUE C: ORDEN DE COMPRA (PO) (SI LLEGÓ A ETAPA 4 EN ADELANTE) ── */}
                {ordenCompra && (
                  <div className="bg-white rounded-xl border border-purple-200 overflow-hidden shadow-2xs">
                    <div className="px-4 py-3 bg-purple-50/60 border-b border-purple-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-purple-950 text-xs">
                        <Wallet size={16} className="text-purple-600" />
                        <span>Orden de Compra Oficial (PO Autorizada)</span>
                      </div>
                      <span className="font-mono font-bold text-purple-800 text-xs">
                        {ordenCompra.ocoNoPo}
                      </span>
                    </div>

                    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-purple-50/20">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Fecha Emisión PO:</span>
                        <span className="font-medium text-slate-800 text-xs">
                          {formatDate(ordenCompra.ocoFechaEmision, '2026-03-01')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Subtotal:</span>
                        <span className="font-mono font-medium text-slate-800 text-xs">
                          {formatCurrency(ordenCompra.ocoSubtotal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">IVA (12%):</span>
                        <span className="font-mono font-medium text-slate-800 text-xs">
                          {formatCurrency(ordenCompra.ocoMontoIva)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Total Autorizado PO:</span>
                        <span className="font-mono font-bold text-purple-700 text-sm">
                          {formatCurrency(ordenCompra.ocoTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── BLOQUE D: RECEPCIÓN EN BODEGA (SI LLEGÓ A ETAPA 5 EN ADELANTE) ── */}
                {recepcionBodega && (
                  <div className="bg-white rounded-xl border border-cyan-200 overflow-hidden shadow-2xs">
                    <div className="px-4 py-3 bg-cyan-50/60 border-b border-cyan-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-cyan-950 text-xs">
                        <Warehouse size={16} className="text-cyan-600" />
                        <span>Comprobante de Ingreso en Bodega (GRN)</span>
                      </div>
                      <span className="font-mono font-bold text-cyan-800 text-xs">
                        {recepcionBodega.rboNoRecepcion}
                      </span>
                    </div>

                    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-cyan-50/20">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Bodega Destino:</span>
                        <span className="font-medium text-slate-800 text-xs">
                          {recepcionBodega.rboNombreBodega || recepcionBodega.bodNombre || `Bodega #${recepcionBodega.rboIdBodega}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Tipo de Ingreso:</span>
                        <span className="font-bold text-xs text-cyan-900">
                          {recepcionBodega.rboTipoRecepcion || 'TOTAL'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Guía de Despacho:</span>
                        <span className="font-mono text-slate-800 text-xs">
                          {recepcionBodega.guiaDespacho || 'S/D'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Monto Ingresado Kardex:</span>
                        <span className="font-mono font-bold text-cyan-800 text-sm">
                          {formatCurrency(recepcionBodega.rboTotalFacturar)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── BLOQUE E: LIQUIDACIÓN 3-WAY MATCH & CXP (ETAPA 6) ── */}
                {facturaExistente && (
                  <div className="bg-white rounded-xl border border-teal-200 overflow-hidden shadow-2xs">
                    <div className="px-4 py-3 bg-teal-50/60 border-b border-teal-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-teal-950 text-xs">
                        <Receipt size={16} className="text-teal-600" />
                        <span>Liquidación 3-Way Match & Factura CXP</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                        100% CONFORME
                      </span>
                    </div>

                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-teal-50/20">
                      <div>
                        <span className="text-slate-500 text-[11px] block">No. Factura / Serie:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {facturaExistente.facNoFactura}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Fecha Factura:</span>
                        <span className="font-medium text-slate-800 text-xs">
                          {formatDate(facturaExistente.facFechaFactura, '2026-03-01')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Total Liquidado CXP:</span>
                        <span className="font-mono font-bold text-teal-700 text-sm">
                          {formatCurrency(facturaExistente.facTotalFactura)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* FOOTER CON BOTONES ESTANDARIZADOS DE ACCIÓN */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Auditoría y trazabilidad en tiempo real desde la base de datos Oracle</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="font-semibold text-slate-700 shadow-sm transition-all"
            >
              Cerrar
            </Button>

            {!isRej && (
              <Button
                variant="primary"
                size="sm"
                icon={ArrowRight}
                iconPosition="right"
                onClick={handleGoToStage}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm font-semibold transition-all"
              >
                {isComplete ? 'Ver Detalle en 3-Way Match' : `Gestionar en ${meta.label}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
