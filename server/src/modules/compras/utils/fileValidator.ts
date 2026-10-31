/**
 * Validador estricto de archivos adjuntos para el Módulo de Compras (COMP-008).
 * Valida tamaño máximo permitido y firma binaria real (Magic Bytes) para evitar
 * archivos ejecutables, scripts o binarios maliciosos renombrados como PDF.
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Firmas de archivos peligrosos conocidos (magic bytes)
 */
const DANGEROUS_SIGNATURES: { name: string; bytes: number[] }[] = [
  { name: 'Windows Executable (PE/EXE/DLL)', bytes: [0x4d, 0x5a] }, // MZ
  { name: 'Linux Executable (ELF)', bytes: [0x7f, 0x45, 0x4c, 0x46] }, // \x7fELF
  { name: 'Java Bytecode / Mach-O', bytes: [0xca, 0xfe, 0xba, 0xbe] },
  { name: 'RAR Archive', bytes: [0x52, 0x61, 0x72, 0x21] }, // Rar!
  { name: '7-Zip Archive', bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { name: 'Shell Script', bytes: [0x23, 0x21] }, // #!
];

/**
 * Valida un Buffer para asegurar que corresponda legítimamente a un documento PDF.
 * Un archivo PDF válido DEBE comenzar con "%PDF-" (bytes 0x25, 0x50, 0x44, 0x46, 0x2D).
 */
export function validatePdfBuffer(
  buffer: Buffer | Uint8Array | null | undefined,
  maxSizeBytes: number = MAX_FILE_SIZE_BYTES
): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'El archivo está vacío o no fue proporcionado.' };
  }

  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // 1. Validación estricta de tamaño máximo
  if (buf.length > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    const actualMb = (buf.length / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo permitido de ${maxMb}MB (Tamaño actual: ${actualMb}MB).`,
    };
  }

  // 2. Validación de firmas de ejecutables o binarios peligrosos
  for (const sig of DANGEROUS_SIGNATURES) {
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buf[i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return {
        valid: false,
        error: `Archivo rechazado por seguridad: el contenido corresponde a un binario o ejecutable no permitido (${sig.name}).`,
      };
    }
  }

  // 3. Validación de Magic Bytes de PDF: "%PDF-" (primeros 5 bytes)
  // % = 0x25, P = 0x50, D = 0x44, F = 0x46, - = 0x2D
  const isPdfMagic =
    buf.length >= 5 &&
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46 &&
    buf[4] === 0x2d;

  if (!isPdfMagic) {
    // También verificar si hay un preámbulo UTF-8 BOM
    const hasBom = buf.length >= 8 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const isPdfWithBom =
      hasBom &&
      buf[3] === 0x25 &&
      buf[4] === 0x50 &&
      buf[5] === 0x44 &&
      buf[6] === 0x46 &&
      buf[7] === 0x2d;

    if (!isPdfWithBom) {
      return {
        valid: false,
        error: 'El archivo no es un documento PDF válido (Firma binaria corrupta o no coincide con la especificación PDF).',
      };
    }
  }

  return { valid: true };
}

/**
 * Validador para middleware de Multer (fileFilter)
 */
export function multerPdfFilter(
  _req: any,
  file: Express.Multer.File,
  cb: any
) {
  const ext = (file.originalname || '').toLowerCase();
  if (!ext.endsWith('.pdf')) {
    return cb(new Error('Solo se permiten documentos con extensión .pdf'), false);
  }

  if (file.mimetype && file.mimetype !== 'application/pdf' && file.mimetype !== 'application/x-pdf') {
    return cb(new Error(`Tipo de contenido inválido (${file.mimetype}). Solo se admite application/pdf`), false);
  }

  cb(null, true);
}
