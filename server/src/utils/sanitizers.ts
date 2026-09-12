/**
 * server/src/utils/sanitizers.ts
 * Utilidades centralizadas de saneamiento y validación defensiva de datos para los servicios del ERP.
 */

// Caracteres peligrosos explícitamente prohibidos para nombres nominales (*, /, @, <, >, =, ;, etc.)
export const CARACTERES_PROHIBIDOS_REGEX = /[*\/@<>=;\\!$%#^?{}[\]~+&|`]/;

// Caracteres prohibidos en direcciones o notas libres (permite #, /, comas, puntos y guiones, pero bloquea inyecciones HTML/SQL)
export const CARACTERES_DIRECCION_PROHIBIDOS_REGEX = /[<>=;\\!$%^?{}[\]~+&|`]/;

// Regex para nombres nominales (letras con acentos y eñes, números, espacios, puntos, comas, guiones y paréntesis)
export const NOMBRE_NOMINAL_REGEX = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\.,\-\(\)]+$/;

// Regex para códigos restrictivos (alfanumérico en mayúsculas, guiones, puntos y guion bajo)
export const CODIGO_ESTRICTO_REGEX = /^[A-Z0-9\.\-_]+$/;

// Regex para códigos con guion bajo exclusivamente (ej. tipos de movimiento)
export const CODIGO_TIPO_MOVIMIENTO_REGEX = /^[A-Z0-9_]+$/;

// Regex para abreviaturas de unidades de medida (permite letras, números, puntos y diagonal '/')
export const ABREVIATURA_UNIDAD_REGEX = /^[A-Z0-9\.\/]+$/;

// Regex para formato de fecha ISO YYYY-MM-DD
export const FECHA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida y sanea un código restrictivo
 */
export function validateStrictCode(
  value: unknown,
  fieldName: string,
  maxLen: number = 30,
  minLen: number = 1
): string {
  if (value === undefined || value === null || typeof value !== 'string') {
    throw new Error(`El campo ${fieldName} es obligatorio y debe ser una cadena de texto.`);
  }

  const trimmed = value.trim().toUpperCase();

  if (trimmed.length < minLen) {
    throw new Error(`El campo ${fieldName} es obligatorio.`);
  }

  if (trimmed.length > maxLen) {
    throw new Error(`El campo ${fieldName} no puede exceder los ${maxLen} caracteres.`);
  }

  if (!CODIGO_ESTRICTO_REGEX.test(trimmed)) {
    throw new Error(
      `El campo ${fieldName} solo permite letras mayúsculas, dígitos numéricos, guiones y puntos (sin espacios ni símbolos especiales).`
    );
  }

  return trimmed;
}

/**
 * Valida y sanea texto nominal (nombres, marcas, categorías, descripciones estándar)
 */
export function validateNominalText(
  value: unknown,
  fieldName: string,
  maxLen: number = 100,
  minLen: number = 1
): string {
  if (value === undefined || value === null || typeof value !== 'string') {
    throw new Error(`El campo ${fieldName} es obligatorio y debe ser una cadena de texto.`);
  }

  const trimmed = value.trim();

  if (trimmed.length < minLen) {
    throw new Error(`El campo ${fieldName} es obligatorio.`);
  }

  if (trimmed.length > maxLen) {
    throw new Error(`El campo ${fieldName} no puede exceder los ${maxLen} caracteres.`);
  }

  if (CARACTERES_PROHIBIDOS_REGEX.test(trimmed)) {
    throw new Error(
      `El campo ${fieldName} contiene caracteres especiales no permitidos (*, /, @, <, >, =, etc.).`
    );
  }

  if (!NOMBRE_NOMINAL_REGEX.test(trimmed)) {
    throw new Error(
      `El campo ${fieldName} solo permite letras, números, espacios, puntos, comas y guiones.`
    );
  }

  return trimmed;
}

/**
 * Valida y sanea direcciones o notas libres contra inyecciones
 */
export function validateAddressOrNotes(
  value: unknown,
  fieldName: string,
  maxLen: number = 250
): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`El campo ${fieldName} debe ser una cadena de texto.`);
  }

  const trimmed = value.trim();
  if (trimmed === '') return null;

  if (trimmed.length > maxLen) {
    throw new Error(`El campo ${fieldName} no puede exceder los ${maxLen} caracteres.`);
  }

  if (CARACTERES_DIRECCION_PROHIBIDOS_REGEX.test(trimmed)) {
    throw new Error(
      `El campo ${fieldName} contiene caracteres peligrosos bloqueados por seguridad (<, >, =, ;, \\, etc.).`
    );
  }

  return trimmed;
}

/**
 * Valida un identificador numérico o clave foránea positiva
 */
export function validateNumericId(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (value === undefined || value === null || isNaN(num) || !Number.isInteger(num) || num <= 0) {
    throw new Error(`El campo ${fieldName} debe ser un número entero positivo mayor a cero.`);
  }
  return num;
}

/**
 * Valida una bandera booleana (0 o 1)
 */
export function validateBooleanFlag(value: unknown, fieldName: string, defaultValue: number = 1): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const num = Number(value);
  if (![0, 1].includes(num)) {
    throw new Error(`El campo ${fieldName} solo admite valores 0 o 1.`);
  }
  return num;
}

/**
 * Valida formato de fecha ISO YYYY-MM-DD opcional y real en el calendario
 */
export function validateDateString(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`El campo ${fieldName} debe ser una fecha válida en formato YYYY-MM-DD.`);
  }
  const dateStr = value.slice(0, 10);
  if (!FECHA_ISO_REGEX.test(dateStr)) {
    throw new Error(`El campo ${fieldName} debe tener el formato YYYY-MM-DD.`);
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(`${dateStr}T00:00:00Z`);

  if (
    isNaN(dateObj.getTime()) ||
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() + 1 !== month ||
    dateObj.getUTCDate() !== day
  ) {
    throw new Error(`El campo ${fieldName} no es una fecha válida en el calendario.`);
  }

  return dateStr;
}

/**
 * Valida coherencia cronológica de fechas de lote
 */
export function validateLotDates(fechaProd?: string | null, fechaVenc?: string | null): void {
  if (fechaProd && fechaVenc) {
    if (new Date(fechaVenc).getTime() < new Date(fechaProd).getTime()) {
      throw new Error('La fecha de vencimiento no puede ser anterior a la fecha de producción.');
    }
  }
}
