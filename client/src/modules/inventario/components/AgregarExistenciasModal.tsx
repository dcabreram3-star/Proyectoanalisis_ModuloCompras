import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  PackagePlus,
  Package,
  Warehouse,
  MapPin,
  Barcode,
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Boxes,
  TrendingUp,
} from 'lucide-react';
import { TextInput, Select } from '../../../components/ui';
import { FormActionButtons } from '../../../shared/components/FormActionButtons';
import type { IArticulo, IBodega, IUbicacion, ILote, IAgregarExistenciasDTO } from '@erp/contracts';
import { articuloService } from '../services/articulo.service';
import { BodegaClientService } from '../services/bodegaClientService';
import { UbicacionClientService } from '../services/ubicacionClientService';
import { LoteClientService } from '../services/loteClientService';
import { MovimientoInventarioClientService } from '../services/movimientoInventarioClientService';

export interface AgregarExistenciasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (resultado: any) => void;
  initialArticuloCodigo?: string;
  initialBodegaId?: number;
}

export const AgregarExistenciasModal: React.FC<AgregarExistenciasModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialArticuloCodigo,
  initialBodegaId,
}) => {
  // Catalogs
  const [articulos, setArticulos] = useState<IArticulo[]>([]);
  const [bodegas, setBodegas] = useState<IBodega[]>([]);
  const [ubicaciones, setUbicaciones] = useState<IUbicacion[]>([]);
  const [lotes, setLotes] = useState<ILote[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(true);

  // Form State
  const [codigoArticulo, setCodigoArticulo] = useState<string>(initialArticuloCodigo || '');
  const [idBodega, setIdBodega] = useState<number | ''>(initialBodegaId || '');
  const [idUbicacion, setIdUbicacion] = useState<number | ''>('');
  const [idLote, setIdLote] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState<string>('');
  const [costoUnitario, setCostoUnitario] = useState<string>('');
  const [notas, setNotas] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Article search dropdown
  const [isArticleDropdownOpen, setIsArticleDropdownOpen] = useState<boolean>(false);
  const [articleSearchQuery, setArticleSearchQuery] = useState<string>('');
  const articleDropdownRef = useRef<HTMLDivElement>(null);

  // Cargar Catálogos Iniciales
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCatalogs = async () => {
      setIsLoadingCatalogs(true);
      setErrorMsg(null);
      try {
        const [artsData, bodsData] = await Promise.all([
          articuloService.obtenerTodos({ soloActivos: true }),
          BodegaClientService.getBodegas({ activo: 1 }),
        ]);

        if (!isMounted) return;

        setArticulos(artsData || []);
        setBodegas(bodsData || []);

        if (initialArticuloCodigo) {
          setCodigoArticulo(initialArticuloCodigo);
        } else if (artsData && artsData.length > 0 && !codigoArticulo) {
          setCodigoArticulo(artsData[0].ART_CODIGO_ARTICULO);
        }

        if (initialBodegaId) {
          setIdBodega(initialBodegaId);
        } else if (bodsData && bodsData.length > 0 && !idBodega) {
          setIdBodega(bodsData[0].bodIdBodega);
        }
      } catch (err: any) {
        console.error('[AgregarExistenciasModal] Error al cargar catálogos:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Error al cargar los catálogos necesarios.');
        }
      } finally {
        if (isMounted) setIsLoadingCatalogs(false);
      }
    };

    fetchCatalogs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialArticuloCodigo, initialBodegaId]);

  // Sincronizar selección inicial cuando cambien props
  useEffect(() => {
    if (initialArticuloCodigo) {
      setCodigoArticulo(initialArticuloCodigo);
    }
  }, [initialArticuloCodigo]);

  useEffect(() => {
    if (initialBodegaId) {
      setIdBodega(initialBodegaId);
    }
  }, [initialBodegaId]);

  // Cargar ubicaciones cuando cambie la bodega
  useEffect(() => {
    if (!idBodega || Number(idBodega) <= 0) {
      setUbicaciones([]);
      setIdUbicacion('');
      return;
    }

    let isMounted = true;
    const fetchUbicaciones = async () => {
      try {
        const ubiData = await UbicacionClientService.getUbicaciones({
          idBodega: Number(idBodega),
          activo: 1,
        });
        if (isMounted) {
          setUbicaciones(ubiData || []);
          setIdUbicacion('');
        }
      } catch (err) {
        if (isMounted) setUbicaciones([]);
      }
    };

    fetchUbicaciones();
    return () => {
      isMounted = false;
    };
  }, [idBodega]);

  // Cargar lotes si el artículo maneja lotes
  const selectedArticulo = useMemo(() => {
    return articulos.find(
      (a) => a.ART_CODIGO_ARTICULO.toUpperCase() === codigoArticulo.toUpperCase()
    );
  }, [articulos, codigoArticulo]);

  useEffect(() => {
    if (!codigoArticulo || !selectedArticulo || selectedArticulo.ART_MANEJA_LOTE !== 1) {
      setLotes([]);
      setIdLote('');
      return;
    }

    let isMounted = true;
    const fetchLotes = async () => {
      try {
        const lotData = await LoteClientService.getLotes({
          codigoArticulo: codigoArticulo.trim().toUpperCase(),
          estado: 'ACTIVO',
        });
        if (isMounted) {
          setLotes(lotData || []);
          setIdLote('');
        }
      } catch (err) {
        if (isMounted) setLotes([]);
      }
    };

    fetchLotes();
    return () => {
      isMounted = false;
    };
  }, [codigoArticulo, selectedArticulo]);

  // Cerrar dropdown de artículos al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        articleDropdownRef.current &&
        !articleDropdownRef.current.contains(e.target as Node)
      ) {
        setIsArticleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrado de artículos en el selector autocompletable
  const filteredArticulos = useMemo(() => {
    if (!articleSearchQuery.trim()) return articulos;
    const q = articleSearchQuery.toLowerCase();
    return articulos.filter(
      (a) =>
        a.ART_CODIGO_ARTICULO.toLowerCase().includes(q) ||
        a.ART_DESCRIPCION.toLowerCase().includes(q)
    );
  }, [articulos, articleSearchQuery]);

  // Validación de formulario
  const numCantidad = parseFloat(cantidad);
  const isCantidadValid = !isNaN(numCantidad) && isFinite(numCantidad) && numCantidad > 0;
  const numCosto = costoUnitario.trim() ? parseFloat(costoUnitario) : 0;
  const isCostoValid = !costoUnitario.trim() || (!isNaN(numCosto) && isFinite(numCosto) && numCosto >= 0);
  const isBodegaValid = Boolean(idBodega && Number(idBodega) > 0);
  const isArticuloValid = Boolean(codigoArticulo.trim());

  const isFormValid = isArticuloValid && isBodegaValid && isCantidadValid && isCostoValid;

  const blockers: Record<string, string | undefined> = {};
  if (!isArticuloValid) blockers['articulo'] = 'Debe seleccionar un artículo.';
  if (!isBodegaValid) blockers['bodega'] = 'Debe seleccionar la bodega destino.';
  if (!isCantidadValid) blockers['cantidad'] = 'La cantidad debe ser un número positivo mayor a 0.';
  if (!isCostoValid) blockers['costo'] = 'El costo unitario no puede ser negativo.';

  // Stock Proyectado
  const stockActual = selectedArticulo?.STOCK_TOTAL || 0;
  const stockProyectado = isCantidadValid ? stockActual + numCantidad : stockActual;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: IAgregarExistenciasDTO = {
        codigoArticulo: codigoArticulo.trim().toUpperCase(),
        idBodega: Number(idBodega),
        cantidad: numCantidad,
        costoUnitario: costoUnitario.trim() ? numCosto : undefined,
        idUbicacion: idUbicacion ? Number(idUbicacion) : undefined,
        idLote: idLote ? Number(idLote) : undefined,
        notas: notas.trim() || undefined,
      };

      const resultado = await MovimientoInventarioClientService.agregarExistencias(payload);

      setSuccessMsg(
        `¡Existencias añadidas con éxito! Movimiento generado: ${resultado.noMovimiento || 'OK'}.`
      );

      if (onSuccess) {
        onSuccess(resultado);
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('[AgregarExistenciasModal] Error:', err);
      setErrorMsg(err.message || 'Error al procesar el incremento de existencias.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <PackagePlus size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Añadir Existencias a Producto
              </h2>
              <p className="text-xs text-slate-500">
                Ajuste de entrada y actualización atómica del Kardex (AJU_ENTRADA)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario / Contenido Scrolleable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Alertas de error o éxito */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle size={17} className="shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 size={17} className="shrink-0 mt-0.5 text-emerald-600" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Campo 1: Selector de Artículo (Autocomplete Compacto) */}
          <div className="space-y-1.5" ref={articleDropdownRef}>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Artículo a Incrementar <span className="text-rose-500">*</span>
            </label>

            <div className="relative">
              <div
                onClick={() => !isSubmitting && setIsArticleDropdownOpen(!isArticleDropdownOpen)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg flex items-center justify-between cursor-pointer hover:border-slate-400 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 transition-all text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <Package size={16} className="text-slate-400 shrink-0" />
                  {selectedArticulo ? (
                    <span className="truncate text-slate-800 font-medium">
                      <strong className="font-mono text-emerald-700">{selectedArticulo.ART_CODIGO_ARTICULO}</strong>{' '}
                      — {selectedArticulo.ART_DESCRIPCION}
                    </span>
                  ) : (
                    <span className="text-slate-400">Seleccione un artículo activo...</span>
                  )}
                </div>
                <ChevronDown size={16} className="text-slate-400 shrink-0 ml-1" />
              </div>

              {/* Menú Flotante de Selección */}
              {isArticleDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-hidden flex flex-col animate-scaleUp">
                  <div className="p-2 border-b border-slate-100 flex items-center gap-2 text-slate-400 bg-slate-50">
                    <Search size={15} />
                    <input
                      type="text"
                      autoFocus
                      className="w-full text-xs outline-none text-slate-800 bg-transparent"
                      placeholder="Buscar por código o descripción..."
                      value={articleSearchQuery}
                      onChange={(e) => setArticleSearchQuery(e.target.value)}
                    />
                  </div>
                  <ul className="overflow-y-auto divide-y divide-slate-50 text-xs">
                    {filteredArticulos.length > 0 ? (
                      filteredArticulos.map((art) => (
                        <li
                          key={art.ART_CODIGO_ARTICULO}
                          className="px-3 py-2.5 text-slate-700 hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors"
                          onClick={() => {
                            setCodigoArticulo(art.ART_CODIGO_ARTICULO);
                            setIsArticleDropdownOpen(false);
                            setArticleSearchQuery('');
                          }}
                        >
                          <div className="truncate mr-2">
                            <span className="font-mono font-bold text-slate-900 mr-2">
                              {art.ART_CODIGO_ARTICULO}
                            </span>
                            <span className="text-slate-600">{art.ART_DESCRIPCION}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400 shrink-0 bg-slate-100 px-2 py-0.5 rounded-md">
                            Stock: {art.STOCK_TOTAL || 0}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-4 text-center text-slate-400 italic">
                        No se encontraron artículos
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Fila 2: Bodega y Ubicación (Compactos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="Bodega de Destino *"
                value={idBodega}
                onChange={(e) => setIdBodega(Number(e.target.value))}
                options={[
                  { value: '', label: 'Seleccionar bodega...' },
                  ...bodegas.map((b) => ({
                    value: b.bodIdBodega,
                    label: `${b.bodNombre} (${b.bodCodigo})`,
                  })),
                ]}
                disabled={isSubmitting || isLoadingCatalogs}
              />
            </div>

            <div>
              <Select
                label="Ubicación Física (Opcional)"
                value={idUbicacion}
                onChange={(e) => setIdUbicacion(e.target.value ? Number(e.target.value) : '')}
                options={[
                  { value: '', label: 'Por defecto en bodega' },
                  ...ubicaciones.map((u) => ({
                    value: u.ubiIdUbicacion,
                    label: `${u.ubiCodigoUbicacion || 'Ubicación'} - ${u.ubiPasillo || ''} ${u.ubiRack || ''}`.trim(),
                  })),
                ]}
                disabled={isSubmitting || ubicaciones.length === 0}
              />
            </div>
          </div>

          {/* Fila 3: Control de Lote (Si el artículo lo requiere) */}
          {selectedArticulo && selectedArticulo.ART_MANEJA_LOTE === 1 && (
            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <Barcode size={15} className="text-purple-600" />
                <span>Control de Lote Activo para este Artículo</span>
              </div>
              <Select
                label="Lote de Producción (Opcional)"
                value={idLote}
                onChange={(e) => setIdLote(e.target.value ? Number(e.target.value) : '')}
                options={[
                  { value: '', label: 'Lote General / Asignación Automática' },
                  ...lotes.map((l) => ({
                    value: l.lotIdLote,
                    label: `Lote ${l.lotNumeroLote} (Vence: ${l.lotFechaVencimiento ? new Date(l.lotFechaVencimiento).toLocaleDateString() : 'N/A'})`,
                  })),
                ]}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Fila 4: Cantidad a Añadir y Costo Unitario (Inputs Numéricos de Ancho Controlado) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Cantidad a Añadir <span className="text-rose-500">*</span>
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="Ej: 10"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-mono font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-400">Número positivo (entero o decimal).</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Costo Unitario (Q) <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={costoUnitario}
                  onChange={(e) => setCostoUnitario(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <span className="text-[11px] text-slate-400">Si se omite, se asume Q 0.00.</span>
            </div>
          </div>

          {/* Fila 5: Notas / Justificación de la Entrada */}
          <div className="space-y-1">
            <TextInput
              label="MOTIVO / JUSTIFICACIÓN"
              placeholder="Ej: Ingreso de inventario inicial, ajuste físico de almacén..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* TARJETA DE RESUMEN Y PROYECCIÓN VISUAL */}
          {selectedArticulo && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Proyección de Existencias
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedArticulo.ART_DESCRIPCION}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="text-center px-2 py-1 bg-white rounded-md border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block">Actual</span>
                  <span className="font-bold text-slate-700">{stockActual} Unds.</span>
                </div>
                <span className="text-emerald-600 font-bold text-base">+</span>
                <div className="text-center px-2 py-1 bg-white rounded-md border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] text-emerald-600 block">Añadir</span>
                  <span className="font-bold text-emerald-700">
                    {isCantidadValid ? numCantidad : 0} Unds.
                  </span>
                </div>
                <span className="text-slate-400 font-bold">=</span>
                <div className="text-center px-3 py-1 bg-emerald-600 text-white rounded-md shadow-xs">
                  <span className="text-[10px] text-emerald-200 block">Nuevo Stock</span>
                  <span className="font-extrabold text-sm">{stockProyectado} Unds.</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Fijo con FormActionButtons unificado */}
          <div className="pt-3 border-t border-slate-100">
            <FormActionButtons
              onCancel={onClose}
              isSubmitting={isSubmitting}
              createLabel="Añadir Existencias"
              savingLabel="Registrando incremento..."
              isFormValid={isFormValid}
              blockers={blockers}
              skipConfirm
            />
          </div>
        </form>
      </div>
    </div>
  );
};
