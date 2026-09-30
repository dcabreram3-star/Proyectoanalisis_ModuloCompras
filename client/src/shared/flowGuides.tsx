import {
  FileText,
  CheckCircle2,
  FileSpreadsheet,
  DollarSign,
  Wallet,
  Warehouse,
  FileCheck2,
  Package,
  Boxes,
  ArrowLeftRight,
  ClipboardCheck,
} from 'lucide-react';
import { FlowStep } from './components/FlowGuideModal';

/**
 * Textos y orden del flujo de Compras, tomados de las mismas 7 etapas operativas
 * que ya usa PIPELINE_STAGE_OPTIONS en PipelineProgress.tsx. Si el pipeline cambia
 * de etapas, actualice este arreglo para que la guía siga coincidiendo.
 */
export const FLUJO_COMPRAS: FlowStep[] = [
  {
    icon: FileText,
    titulo: '1. Solicitud',
    descripcion: 'Se crea la solicitud de compra con los artículos y cantidades que se necesitan.',
  },
  {
    icon: CheckCircle2,
    titulo: '2. Aprobación',
    descripcion: 'Un responsable revisa la solicitud y aprueba o rechaza las cantidades pedidas.',
  },
  {
    icon: FileSpreadsheet,
    titulo: '3. Matriz de Cotizaciones',
    descripcion: 'Se registran las cotizaciones de hasta 3 proveedores para comparar precios y condiciones.',
  },
  {
    icon: DollarSign,
    titulo: '4. Selección Financiera',
    descripcion: 'Se elige la mejor cotización y se genera la orden de compra (PO) para el proveedor ganador.',
  },
  {
    icon: Wallet,
    titulo: '5. Validación de Presupuesto',
    descripcion: 'Se confirma que exista presupuesto disponible antes de continuar con la compra.',
  },
  {
    icon: Warehouse,
    titulo: '6. Recepción en Bodega',
    descripcion: 'La bodega recibe físicamente la mercadería y la registra en el inventario.',
  },
  {
    icon: FileCheck2,
    titulo: '7. 3-Way Match',
    descripcion: 'Se compara la orden de compra, la recepción y la factura para liquidar el pago.',
  },
];

/**
 * Flujo de Inventario. A diferencia de Compras, no es una sola cadena obligatoria:
 * Bodegas/Ubicaciones/Artículos son catálogos que se preparan una vez, y luego
 * Lotes, Movimientos y Auditoría se usan de forma recurrente en cualquier orden.
 */
export const FLUJO_INVENTARIO: FlowStep[] = [
  {
    icon: Warehouse,
    titulo: '1. Bodegas y Ubicaciones',
    descripcion: 'Primero se registran las bodegas y sus ubicaciones internas (pasillo, rack, nivel).',
  },
  {
    icon: Package,
    titulo: '2. Artículos',
    descripcion: 'Se da de alta cada artículo del catálogo, con su categoría, marca y unidad de medida.',
  },
  {
    icon: Boxes,
    titulo: '3. Lotes',
    descripcion: 'Si el artículo lo requiere, se registran los lotes con su fecha de producción y vencimiento.',
  },
  {
    icon: ArrowLeftRight,
    titulo: '4. Movimientos / Kardex',
    descripcion: 'Cada entrada, salida o traslado entre bodegas se registra aquí y actualiza las existencias.',
  },
  {
    icon: ClipboardCheck,
    titulo: '5. Auditoría',
    descripcion: 'De forma periódica se hace un conteo físico y se compara contra lo que dice el sistema.',
  },
];