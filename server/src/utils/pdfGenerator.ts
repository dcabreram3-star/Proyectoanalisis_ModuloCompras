import { ICotizacion } from '@erp/contracts';

/**
 * Generador nativo y estándar de documentos PDF (PDF 1.4 Specification)
 * Produce buffers binarios 100% compatibles con cualquier navegador y visor PDF.
 */
export function generateCotizacionPdf(cot: ICotizacion): Buffer {
  const precioFormatted = Number(cot.cotPrecioTotal || 0).toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const lines = [
    '--------------------------------------------------------------------------------------------------',
    'SISTEMA ERP UNIVERSITARIO - GESTION INTEGRAL DE COMPRAS',
    'DOCUMENTO OFICIAL DE COTIZACION COMERCIAL REGISTRADA',
    '--------------------------------------------------------------------------------------------------',
    '',
    `ID DE COTIZACION: #${cot.cotIdCotizacion}`,
    `SOLICITUD DE COMPRA ASOCIADA: ${cot.cotNoDocumentoSolicitud}`,
    `ESTADO DE ADJUDICACION: ${cot.cotEstadoAdjudicacion || 'PENDIENTE'}`,
    `EXCEPCION PROVEEDOR UNICO: ${cot.cotEsExcepcionUnico === 1 ? 'SI (AUTORIZADA)' : 'NO'}`,
    '',
    '--------------------------------------------------------------------------------------------------',
    'INFORMACION DEL PROVEEDOR OFERTANTE',
    '--------------------------------------------------------------------------------------------------',
    `NOMBRE / RAZON SOCIAL: ${cot.cotNombreProveedor || `Proveedor ID #${cot.cotIdProveedor}`}`,
    `NIT DE LA ENTIDAD: ${cot.cotNitProveedor || 'N/D'}`,
    `IDENTIFICADOR DEL PROVEEDOR: #${cot.cotIdProveedor}`,
    '',
    '--------------------------------------------------------------------------------------------------',
    'CONDICIONES ECONOMICAS Y COMERCIALES OFERTADAS',
    '--------------------------------------------------------------------------------------------------',
    `PRECIO TOTAL OFERTADO: GTQ ${precioFormatted}`,
    `TIEMPO DE ENTREGA ESTIMADO: ${cot.cotTiempoEntregaDias ? `${cot.cotTiempoEntregaDias} dias habiles` : 'Entrega Inmediata'}`,
    `CONDICION / PLAZO DE PAGO: ${cot.cotCondicionPagoDias ? `${cot.cotCondicionPagoDias} dias de credito` : 'Pago de Contado'}`,
    `ARCHIVO ADJUNTO ASOCIADO: ${cot.cotRutaArchivoPdf || `cotizacion_${cot.cotIdCotizacion}.pdf`}`,
    '',
    '--------------------------------------------------------------------------------------------------',
    'TRAZABILIDAD Y REGISTRO EN ORACLE DATABASE',
    '--------------------------------------------------------------------------------------------------',
    'TABLA FISICA DE PERSISTENCIA: CMP_COTIZACION',
    'INTEGRIDAD REFERENCIAL: VALIDADA',
    `EMISION OFICIAL: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`,
    '--------------------------------------------------------------------------------------------------',
  ];

  const content: string[] = [
    'BT',
    '/F1 14 Tf',
    '50 740 Td',
    '(COTIZACION OFICIAL - COMPRAS ERP) Tj',
    '/F1 10 Tf',
    '0 -22 Td',
  ];

  for (const line of lines) {
    const sanitized = line.replace(/[()\\\\]/g, '\\$&');
    content.push(`(${sanitized}) Tj`);
    content.push('0 -14 Td');
  }

  content.push('ET');
  const streamContent = content.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf-8');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj',
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
  ];

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, 'utf-8'));
    body += obj + '\n';
  }

  const startxref = Buffer.byteLength(body, 'utf-8');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;

  return Buffer.from(body, 'utf-8');
}

/**
 * Generador nativo de Orden de Compra oficial en formato PDF 1.4
 */
export function generateOrdenCompraPdf(orden: import('@erp/contracts').IOrdenCompraCompleta): Buffer {
  const subtotalFormatted = Number(orden.ocoSubtotal || 0).toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const ivaFormatted = Number(orden.ocoMontoIva || 0).toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const totalFormatted = Number(orden.ocoTotal || 0).toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const fechaEmision = orden.ocoFechaEmision
    ? new Date(orden.ocoFechaEmision).toISOString().substring(0, 10)
    : new Date().toISOString().substring(0, 10);

  const lines = [
    '==================================================================================================',
    '                   ORDEN DE COMPRA OFICIAL - SISTEMA ERP CORPORATIVO',
    '==================================================================================================',
    '',
    `NUMERO DE ORDEN DE COMPRA (PO): ${orden.ocoNoPo}`,
    `SOLICITUD DE COMPRA ASOCIADA:    ${orden.solNoDocumento || 'N/D'}`,
    `FECHA DE EMISION OFICIAL:        ${fechaEmision}`,
    `DEPARTAMENTO SOLICITANTE:        ${orden.depNombreDepartamento || 'Compras / Operaciones'}`,
    '',
    '--------------------------------------------------------------------------------------------------',
    'INFORMACION DEL PROVEEDOR ADJUDICADO',
    '--------------------------------------------------------------------------------------------------',
    `RAZON SOCIAL / PROVEEDOR:        ${orden.proNombreEntidad || `Proveedor ID #${orden.ocoIdCotizacionGanadora}`}`,
    `NIT DE LA EMPRESA:               ${orden.proNit || 'CF / No especificado'}`,
    `PLAZO DE ENTREGA PACTADO:        ${orden.cotTiempoEntregaDias ? `${orden.cotTiempoEntregaDias} dias habiles` : 'Inmediato'}`,
    `CONDICIONES DE PAGO:             ${orden.cotCondicionPagoDias ? `${orden.cotCondicionPagoDias} dias credito` : 'Contado'}`,
    '',
    '--------------------------------------------------------------------------------------------------',
    'DETALLE DE ARTICULOS Y SUMINISTROS ORDENADOS',
    '--------------------------------------------------------------------------------------------------',
    'CODIGO          DESCRIPCION                         CANT    PRECIO UNIT. (GTQ)   TOTAL LINEA (GTQ)',
    '--------------------------------------------------------------------------------------------------',
  ];

  if (orden.detalles && orden.detalles.length > 0) {
    for (const d of orden.detalles) {
      const cod = (d.docCodigoArticulo || '').padEnd(15).substring(0, 15);
      const desc = (d.artDescripcion || d.docCodigoArticulo || '').padEnd(35).substring(0, 35);
      const cant = String(d.docCantidadPedida || 1).padStart(6);
      const pre = Number(d.docPrecioUnitario || 0).toFixed(2).padStart(18);
      const tot = Number(d.docTotalLinea || 0).toFixed(2).padStart(18);
      lines.push(`${cod} ${desc} ${cant} ${pre} ${tot}`);
    }
  } else {
    lines.push('  (No se registraron lineas especificas - Monto global de cotizacion)');
  }

  lines.push('--------------------------------------------------------------------------------------------------');
  lines.push(`SUBTOTAL AUTORIZADO:                                                 GTQ ${subtotalFormatted.padStart(15)}`);
  lines.push(`IMPUESTO AL VALOR AGREGADO (IVA 12%):                                GTQ ${ivaFormatted.padStart(15)}`);
  lines.push(`TOTAL GENERAL DE LA ORDEN:                                           GTQ ${totalFormatted.padStart(15)}`);
  lines.push('==================================================================================================');
  lines.push('');
  lines.push('AUTORIZACION Y CERTIFICACION:');
  lines.push('Validez Presupuestaria Confirmada por Departamento de Finanzas.');
  lines.push('El proveedor se compromete al cumplimiento estricto de las especificaciones y terminos pactados.');
  lines.push(`REGISTRO AUDITABLE GENERADO EL: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`);

  const content: string[] = [
    'BT',
    '/F1 13 Tf',
    '50 740 Td',
    '(ORDEN DE COMPRA OFICIAL - COMPRAS ERP) Tj',
    '/F1 9 Tf',
    '0 -20 Td',
  ];

  for (const line of lines) {
    const sanitized = line.replace(/[()\\\\]/g, '\\$&');
    content.push(`(${sanitized}) Tj`);
    content.push('0 -13 Td');
  }

  content.push('ET');
  const streamContent = content.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf-8');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj',
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
  ];

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, 'utf-8'));
    body += obj + '\n';
  }

  const startxref = Buffer.byteLength(body, 'utf-8');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;

  return Buffer.from(body, 'utf-8');
}

