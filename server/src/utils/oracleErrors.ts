/**
 * server/src/utils/oracleErrors.ts
 * Traduce errores técnicos de Oracle (ORA-xxxxx, NJS-xxx) a mensajes que el usuario entienda.
 * Los nombres de constraints salen del DDL real de la base (ddl_completo_idempotente).
 */

export interface FriendlyError {
  message: string; // Texto para mostrar al usuario
  status: number;  // Código HTTP sugerido
  code?: string;   // Código técnico original (solo para logs / soporte)
  field?: string;  // Columna Oracle involucrada, si se pudo detectar
}

const REGEX_TECNICO = /\b(ORA|NJS|DPI|DPY)-\d{3,5}/;

// ---------------------------------------------------------------------------
// ORA-00001: duplicados (UNIQUE y PK con clave natural)
// ---------------------------------------------------------------------------
const DUPLICADOS: Record<string, string> = {
  UQ_CMP_BODEGA_CODIGO: 'Ya existe una bodega con ese código. Use un código diferente.',
  UQ_CMP_UBICACION_COD: 'Ya existe una ubicación con ese código en esta bodega. Use un código diferente.',
  UQ_CMP_LOTE_NUM_ART: 'Ya existe un lote con ese número para este artículo. Use un número de lote diferente.',
  UQ_CMP_INV_BOD_ART: 'Este artículo ya está registrado en esa bodega.',
  UQ_CMP_TMI_CODIGO: 'Ya existe un tipo de movimiento con ese código. Use un código diferente.',
  UQ_CMP_MIN_NUMERO: 'Otro usuario registró un movimiento al mismo tiempo. Intente guardar de nuevo.',
  UQ_CMP_TOM_NUM: 'Otro usuario abrió una toma física al mismo tiempo. Intente de nuevo.',
  PK_CMP_ARTICULO: 'Ya existe un artículo con ese código. Use un código diferente.',
  PK_CMP_SOLICITUD_COMPRA: 'Ya existe una solicitud con ese número de documento. Intente guardar de nuevo.',
  PK_CMP_ORDEN_COMPRA: 'Ya existe una orden de compra con ese número.',
  PK_CMP_RECEPCION_BODEGA: 'Ya existe una recepción con ese número.',
  PK_CMP_FACTURA_CXP: 'Ya existe una factura registrada con ese número.',
};

// ---------------------------------------------------------------------------
// ORA-02290: CHECK constraints
// ---------------------------------------------------------------------------
const CHECKS: Record<string, string> = {
  CK_CMP_DMI_CANTIDAD: 'La cantidad de cada artículo debe ser mayor a cero.',
  CK_CMP_INV_EXISTENCIAS: 'Las cantidades de inventario no pueden ser negativas y el stock máximo no puede ser menor al mínimo.',
  CK_CMP_LOT_ESTADO: 'El estado del lote debe ser ACTIVO, VENCIDO, BLOQUEADO o AGOTADO.',
  CK_CMP_TMI_NAT: 'La naturaleza del movimiento debe ser "+" (entrada) o "-" (salida).',
  CK_CMP_MIN_ESTADO: 'El estado del movimiento debe ser BORRADOR, APLICADO o ANULADO.',
  CK_CMP_TOM_ESTADO: 'El estado de la toma física no es válido.',
};
const REGEX_CHECK_SI_NO = /^CK_CMP_.*(ACTIVO|LOTE|VENTAS|AFECTA|EXCEPCION|VERIF|AJUSTADO)$/;

// ---------------------------------------------------------------------------
// ORA-02291 (el padre no existe) y ORA-02292 (el registro tiene hijos)
// padre = lo que se eligió / se quiere eliminar   hijo = dónde se está usando
// ---------------------------------------------------------------------------
interface InfoFk { padre: string; hijo: string; m291?: string }
const ARTICULO_NO_EXISTE = 'El código de artículo ingresado no existe en el catálogo. Regístrelo primero en Artículos.';

const FKS: Record<string, InfoFk> = {
  FK_CMP_ART_CAT: { padre: 'categoría', hijo: 'artículos' },
  FK_CMP_ART_MAR: { padre: 'marca', hijo: 'artículos' },
  FK_CMP_ART_UME_COMPRA: { padre: 'unidad de compra', hijo: 'artículos (unidad de compra)' },
  FK_CMP_ART_UME_VENTA: { padre: 'unidad de venta', hijo: 'artículos (unidad de venta)' },
  FK_CMP_SOL_EST: { padre: 'estado', hijo: 'solicitudes de compra' },
  FK_CMP_OCO_EST: { padre: 'estado', hijo: 'órdenes de compra' },
  FK_CMP_FAC_EST: { padre: 'estado', hijo: 'facturas' },
  FK_CMP_DSO_ART: { padre: 'artículo', hijo: 'solicitudes de compra', m291: 'Uno de los artículos de la solicitud no existe en el catálogo. Regístrelo primero en Artículos.' },
  FK_CMP_DSO_SOL: { padre: 'solicitud', hijo: 'detalle de solicitudes' },
  FK_CMP_COT_SOL: { padre: 'solicitud de compra', hijo: 'cotizaciones', m291: 'La solicitud de compra de esta cotización no existe.' },
  FK_CMP_OCO_COT: { padre: 'cotización', hijo: 'órdenes de compra' },
  FK_CMP_DOC_ART: { padre: 'artículo', hijo: 'órdenes de compra', m291: ARTICULO_NO_EXISTE },
  FK_CMP_DOC_OCO: { padre: 'orden de compra', hijo: 'detalle de órdenes de compra' },
  FK_CMP_RBO_OCO: { padre: 'orden de compra', hijo: 'recepciones' },
  FK_CMP_RBO_BOD: { padre: 'bodega', hijo: 'recepciones' },
  FK_CMP_DRE_ART: { padre: 'artículo', hijo: 'recepciones', m291: ARTICULO_NO_EXISTE },
  FK_CMP_DRE_RBO: { padre: 'recepción', hijo: 'detalle de recepciones' },
  FK_CMP_FAC_OCO: { padre: 'orden de compra', hijo: 'facturas' },
  FK_CMP_FAC_RBO: { padre: 'recepción', hijo: 'facturas' },
  FK_CMP_BOD_SUC: { padre: 'sucursal', hijo: 'bodegas', m291: 'La sucursal de la bodega no existe. Verifique que la sucursal esté registrada.' },
  FK_CMP_BOD_ENC: { padre: 'encargado', hijo: 'bodegas', m291: 'El encargado seleccionado para la bodega no existe.' },
  FK_CMP_UBI_BOD: { padre: 'bodega', hijo: 'ubicaciones' },
  FK_CMP_LOT_ART: { padre: 'artículo', hijo: 'lotes', m291: ARTICULO_NO_EXISTE },
  FK_CMP_INV_BOD: { padre: 'bodega', hijo: 'inventario' },
  FK_CMP_INV_ART: { padre: 'artículo', hijo: 'inventario', m291: ARTICULO_NO_EXISTE },
  FK_CMP_INV_UBI: { padre: 'ubicación', hijo: 'inventario' },
  FK_CMP_MIN_TMI: { padre: 'tipo de movimiento', hijo: 'movimientos de inventario' },
  FK_CMP_MIN_BOD_ORI: { padre: 'bodega de origen', hijo: 'movimientos de inventario' },
  FK_CMP_MIN_BOD_DES: { padre: 'bodega de destino', hijo: 'movimientos de inventario' },
  FK_CMP_MIN_RBO: { padre: 'recepción', hijo: 'movimientos de inventario' },
  FK_CMP_MIN_CXC: { padre: 'documento', hijo: 'movimientos de inventario' },
  FK_CMP_DMI_MIN: { padre: 'movimiento', hijo: 'detalle de movimientos' },
  FK_CMP_DMI_ART: { padre: 'artículo', hijo: 'movimientos de inventario', m291: ARTICULO_NO_EXISTE },
  FK_CMP_DMI_LOT: { padre: 'lote', hijo: 'movimientos de inventario' },
  FK_CMP_DMI_UBI: { padre: 'ubicación', hijo: 'movimientos de inventario' },
  FK_CMP_TOM_BOD: { padre: 'bodega', hijo: 'tomas físicas' },
  FK_CMP_DTF_TOM: { padre: 'toma física', hijo: 'detalle de tomas físicas' },
  FK_CMP_DTF_ART: { padre: 'artículo', hijo: 'tomas físicas', m291: ARTICULO_NO_EXISTE },
  FK_CMP_DTF_UBI: { padre: 'ubicación', hijo: 'tomas físicas' },
  FK_CMP_DTF_LOT: { padre: 'lote', hijo: 'tomas físicas' },
  FK_CXP_DOC_FAC_CMP: { padre: 'factura', hijo: 'cuentas por pagar' },
  FK_CXP_DOC_OC: { padre: 'orden de compra', hijo: 'cuentas por pagar' },
  FK_CXP_DOC_REC: { padre: 'recepción', hijo: 'cuentas por pagar' },
  FK_CXP_DDET_ART: { padre: 'artículo', hijo: 'cuentas por pagar' },
  FK_CXP_DDET_OC: { padre: 'detalle de orden', hijo: 'cuentas por pagar' },
  FK_CXP_DDET_REC: { padre: 'detalle de recepción', hijo: 'cuentas por pagar' },
};

// ---------------------------------------------------------------------------
// Nombres legibles de columnas (ORA-01400 / ORA-12899)
// ---------------------------------------------------------------------------
const CAMPOS: Record<string, string> = {
  ART_CODIGO_ARTICULO: 'el código del artículo',
  ART_DESCRIPCION: 'la descripción del artículo',
  ART_ID_CATEGORIA: 'la categoría',
  ART_ID_MARCA: 'la marca',
  ART_ID_UNIDAD_COMPRA: 'la unidad de compra',
  ART_ID_UNIDAD_VENTA: 'la unidad de venta',
  BOD_CODIGO: 'el código de la bodega',
  BOD_NOMBRE: 'el nombre de la bodega',
  BOD_DIRECCION: 'la dirección de la bodega',
  BOD_ID_SUCURSAL: 'la sucursal de la bodega',
  CAT_NOMBRE_CATEGORIA: 'el nombre de la categoría',
  COT_ID_PROVEEDOR: 'el proveedor',
  COT_PRECIO_TOTAL: 'el precio total',
  COT_RUTA_ARCHIVO_PDF: 'la ruta del PDF de la cotización',
  DMI_CANTIDAD: 'la cantidad',
  DSO_CANTIDAD_PEDIDA: 'la cantidad pedida',
  DTF_STOCK_FISICO: 'el stock físico contado',
  EST_NOMBRE_ESTADO: 'el nombre del estado',
  LOT_NUMERO_LOTE: 'el número de lote',
  LOT_CODIGO_ARTICULO: 'el código del artículo',
  MAR_NOMBRE_MARCA: 'el nombre de la marca',
  MIN_ID_BODEGA_ORIGEN: 'la bodega de origen',
  MIN_ID_TIPO_MOVIMIENTO: 'el tipo de movimiento',
  MIN_ID_USUARIO: 'el usuario responsable',
  MIN_OBSERVACIONES: 'las observaciones',
  PRO_NIT: 'el NIT / DPI del proveedor',
  PRO_NOMBRE_ENTIDAD: 'el nombre del proveedor',
  SOL_ID_DEPARTAMENTO: 'el departamento',
  SOL_ID_USUARIO_RESPONSABLE: 'el responsable',
  SOL_NOTAS: 'las notas',
  TMI_CODIGO: 'el código del tipo de movimiento',
  TMI_DESCRIPCION: 'la descripción del tipo de movimiento',
  TMI_NATURALEZA: 'la naturaleza del movimiento',
  TOM_OBSERVACIONES: 'las observaciones de la toma física',
  UBI_CODIGO_UBICACION: 'el código de la ubicación',
  UBI_PASILLO: 'el pasillo',
  UBI_RACK: 'el rack',
  UBI_NIVEL: 'el nivel',
  UME_ABREVIATURA: 'la abreviatura de la unidad',
  UME_NOMBRE_UNIDAD: 'el nombre de la unidad de medida',
};

const CONEXION = new Set([18, 20, 1012, 1033, 1034, 1089, 3113, 3114, 3135, 12154, 12170, 12500, 12514, 12516, 12518, 12519, 12520, 12537, 12541, 12545, 12560]);
const INTERNOS = new Set([900, 904, 905, 913, 932, 933, 942, 947, 984, 1422, 1427, 4061, 4063, 4065, 4068, 6550, 6553]);
const ESPACIO = new Set([1536, 1650, 1653, 1654, 1688]);
const FECHAS = new Set([1830, 1839, 1840, 1841, 1843, 1847, 1848, 1858, 1861]);
const FORMATO_NUMERICO = new Set([1722, 6502]);
const BLOQUEO = new Set([30, 51, 54, 60]);
const LOGIN = new Set([1017, 28000, 28001]);
const TIMEOUT = new Set([1013, 1555, 8177]);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function extraerTexto(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in (error as any)) return String((error as any).message);
  return '';
}

function nombreCampo(columna?: string): string | undefined {
  if (!columna) return undefined;
  const col = columna.toUpperCase();
  if (CAMPOS[col]) return CAMPOS[col];
  const limpio = col.replace(/^[A-Z]{2,4}_/, '').replace(/^ID_/, '').replace(/_/g, ' ').toLowerCase();
  return `el campo "${limpio}"`;
}

/** Nombre de la constraint que Oracle menciona entre paréntesis: "(ERP.UQ_CMP_BODEGA_CODIGO)" */
function extraerConstraint(raw: string): string | undefined {
  const m = raw.match(/\((?:[\w$#]+\.)?([\w$#]+)\)/);
  return m ? m[1].toUpperCase() : undefined;
}

/**
 * Devuelve un mensaje amigable si el error es técnico de Oracle/driver; si no, devuelve null
 * (los mensajes de negocio ya escritos en español pasan tal cual).
 */
export function traducirErrorOracle(error: unknown): FriendlyError | null {
  const raw = extraerTexto(error);
  if (!raw || !REGEX_TECNICO.test(raw)) return null;

  const m = raw.match(/\b(ORA|NJS|DPI|DPY)-(\d{3,5})/)!;
  const prefijo = m[1];
  const num = Number(m[2]);
  const code = `${prefijo}-${m[2]}`;

  const tresPartes = raw.match(/"([^"]+)"\."([^"]+)"\."([^"]+)"/);
  const columna = tresPartes?.[3] ?? raw.match(/column "([^"]+)"/i)?.[1];
  const constraint = extraerConstraint(raw);
  const res = (message: string, status: number, field?: string): FriendlyError => ({ message, status, code, field });

  // Errores del driver (NJS / DPI / DPY)
  if (prefijo !== 'ORA') {
    if (/NJS-(040|500|501|503|510|511|514|515)|DPI-(1010|1080)|DPY-(4\d{3}|6\d{3})/.test(raw)) {
      return res('No se pudo conectar con la base de datos. Intente de nuevo en unos minutos.', 503);
    }
    return res('Ocurrió un problema interno al procesar la información. Si continúa, avise a soporte.', 500);
  }

  // Mensajes propios lanzados desde PL/SQL con RAISE_APPLICATION_ERROR (ORA-20000 a ORA-20999)
  if (num >= 20000 && num <= 20999) {
    const custom = raw.match(/ORA-20\d{3}:\s*([^\n]+)/)?.[1]?.trim();
    return res(custom || 'La operación no se pudo completar por una regla del sistema.', 400);
  }

  // Duplicados
  if (num === 1) {
    if (constraint && DUPLICADOS[constraint]) return res(DUPLICADOS[constraint], 409);
    if (constraint && constraint.startsWith('PK_')) {
      // PK autogenerada (IDs): el consecutivo chocó con otro usuario guardando al mismo tiempo
      return res('Otro usuario guardó un registro al mismo tiempo. Intente guardar de nuevo.', 409);
    }
    return res('Ese registro ya existe en el sistema. Verifique que no esté duplicado.', 409);
  }

  // Campo obligatorio vacío
  if (num === 1400 || num === 1407) {
    const campo = nombreCampo(columna);
    return res(campo ? `Falta completar ${campo}. Es un dato obligatorio.` : 'Falta completar un campo obligatorio.', 400, columna);
  }

  // Texto demasiado largo
  if (num === 12899) {
    const campo = nombreCampo(columna);
    const actual = raw.match(/actual:\s*(\d+)/i)?.[1];
    const max = raw.match(/maximum:\s*(\d+)/i)?.[1];
    const detalle = max ? ` (máximo ${max} caracteres${actual ? `, ingresó ${actual}` : ''})` : '';
    return res(campo ? `${cap(campo)} excede el largo permitido${detalle}.` : `Uno de los textos ingresados excede el largo permitido${detalle}.`, 400, columna);
  }

  // Número demasiado grande (los montos son NUMBER(10,2) => hasta 99,999,999.99)
  if (num === 1438 || num === 1426) {
    return res('Un número ingresado es demasiado grande. Los montos en quetzales aceptan hasta 99,999,999.99.', 400, columna);
  }

  if (FORMATO_NUMERICO.has(num)) {
    return res('Un dato tiene formato incorrecto: se esperaba un número. Use solo dígitos y punto decimal.', 400);
  }

  if (FECHAS.has(num)) {
    return res('Una de las fechas ingresadas no es válida. Verifique que exista en el calendario y que use el formato correcto.', 400);
  }

  // CHECK constraints
  if (num === 2290) {
    if (constraint && CHECKS[constraint]) return res(CHECKS[constraint], 400);
    if (constraint && REGEX_CHECK_SI_NO.test(constraint)) {
      return res('Un campo de tipo Sí/No trae un valor inválido. Actualice la pantalla e intente de nuevo.', 400);
    }
    return res('Uno de los valores ingresados no está permitido. Revise los datos e intente de nuevo.', 400);
  }

  // FK: el dato relacionado no existe
  if (num === 2291) {
    const fk = constraint ? FKS[constraint] : undefined;
    if (fk?.m291) return res(fk.m291, 400);
    if (fk) return res(`El dato seleccionado en «${fk.padre}» ya no existe o no es válido. Actualice la pantalla y vuelva a elegirlo.`, 400);
    return res('Uno de los datos seleccionados (bodega, marca, categoría, artículo, etc.) ya no existe o no es válido. Actualice la pantalla y vuelva a elegirlo.', 400);
  }

  // FK: el registro se está usando en otro lugar
  if (num === 2292) {
    const fk = constraint ? FKS[constraint] : undefined;
    const donde = fk ? ` en «${fk.hijo}»` : ' en otras partes del sistema';
    return res(`No se puede eliminar porque este registro ya se está usando${donde}. Si ya no lo necesita, márquelo como inactivo.`, 409);
  }

  if (BLOQUEO.has(num)) {
    return res('Otro usuario está modificando este registro en este momento. Espere unos segundos e intente de nuevo.', 409);
  }

  if (num === 1476) return res('Se intentó dividir entre cero. Revise las cantidades ingresadas.', 400);
  if (num === 1403) return res('No se encontró la información solicitada. Es posible que ya haya sido eliminada.', 404);
  if (num === 1031) return res('No tiene permisos para realizar esta acción. Contacte al administrador.', 403);
  if (LOGIN.has(num)) return res('El sistema no pudo iniciar sesión en la base de datos. Avise al administrador.', 503);
  if (CONEXION.has(num)) return res('No se pudo conectar con la base de datos. Intente de nuevo en unos minutos.', 503);
  if (TIMEOUT.has(num)) return res('La operación tardó demasiado o fue cancelada. Intente de nuevo.', 503);
  if (ESPACIO.has(num)) return res('La base de datos no tiene espacio disponible. Avise al administrador.', 503);
  if (INTERNOS.has(num)) return res('Ocurrió un problema interno de configuración. Reporte el error a soporte.', 500);

  return res('Ocurrió un error inesperado al guardar o consultar la información. Si continúa, avise a soporte.', 500);
}