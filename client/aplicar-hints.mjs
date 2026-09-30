// aplicar-hints.mjs  -  Ejecutar UNA vez desde la raíz del proyecto:  node aplicar-hints.mjs
// Envuelve los campos con <FieldHint> y agrega los imports. Es seguro repetirlo (no duplica nada).
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'client/src/modules';
const SHARED = 'client/src/shared/components';
const I = 'inventario/components/';
const C = 'compras/components/';

// [archivo, texto ancla que aparece UNA vez en el campo, tipo, clave en HINTS]
//  tipo 'el'  = el ancla es el label="..." de un <TextInput> o <Select>
//  tipo 'div' = el ancla es el texto de un <label> escrito a mano dentro de un <div>
const CAMPOS = [
  [I + 'MarcaModal.tsx', 'label="NOMBRE DE LA MARCA"', 'el', 'marca.nombre'],
  [I + 'CategoriaModal.tsx', 'label="NOMBRE DE LA CATEGORÍA"', 'el', 'categoria.nombre'],
  [I + 'BodegaModal.tsx', 'label="CÓDIGO"', 'el', 'bodega.codigo'],
  [I + 'BodegaModal.tsx', 'label="NOMBRE DE LA BODEGA"', 'el', 'bodega.nombre'],
  [I + 'BodegaModal.tsx', 'label="DIRECCIÓN / UBICACIÓN FÍSICA"', 'el', 'bodega.direccion'],
  [I + 'UbicacionModal.tsx', 'label="CÓDIGO DE UBICACIÓN"', 'el', 'ubicacion.codigo'],
  [I + 'UbicacionModal.tsx', 'label="PASILLO"', 'el', 'ubicacion.pasillo'],
  [I + 'UbicacionModal.tsx', 'label="RACK"', 'el', 'ubicacion.rack'],
  [I + 'UbicacionModal.tsx', 'label="NIVEL"', 'el', 'ubicacion.nivel'],
  [I + 'UnidadMedidaModal.tsx', 'label="NOMBRE DE LA UNIDAD"', 'el', 'unidad.nombre'],
  [I + 'UnidadMedidaModal.tsx', 'label="ABREVIATURA / SÍMBOLO"', 'el', 'unidad.abreviatura'],
  [I + 'TipoMovimientoModal.tsx', 'label="CÓDIGO ÚNICO"', 'el', 'tipoMovimiento.codigo'],
  [I + 'TipoMovimientoModal.tsx', 'NATURALEZA', 'div', 'tipoMovimiento.naturaleza'],
  [I + 'TipoMovimientoModal.tsx', 'label="DESCRIPCIÓN OPERATIVA"', 'el', 'tipoMovimiento.descripcion'],
  [I + 'ArticuloModal.tsx', 'label="CÓDIGO"', 'el', 'articulo.codigo'],
  [I + 'ArticuloModal.tsx', 'label="DESCRIPCIÓN DEL ARTÍCULO"', 'el', 'articulo.descripcion'],
  [I + 'ArticuloModal.tsx', 'label="CATEGORÍA"', 'el', 'articulo.categoria'],
  [I + 'ArticuloModal.tsx', 'label="MARCA"', 'el', 'articulo.marca'],
  [I + 'ArticuloModal.tsx', 'label="UNIDAD COMPRA"', 'el', 'articulo.unidadCompra'],
  [I + 'ArticuloModal.tsx', 'label="UNIDAD VENTA"', 'el', 'articulo.unidadVenta'],
  [I + 'LoteModal.tsx', 'label="NÚMERO DE LOTE"', 'el', 'lote.numero'],
  [I + 'LoteModal.tsx', 'label="CÓDIGO ARTÍCULO"', 'el', 'lote.codigoArticulo'],
  [I + 'LoteModal.tsx', 'FECHA PRODUCCIÓN', 'div', 'lote.fechaProduccion'],
  [I + 'LoteModal.tsx', 'FECHA VENCIMIENTO', 'div', 'lote.fechaVencimiento'],
  [I + 'LoteModal.tsx', 'ESTADO DEL LOTE', 'div', 'lote.estado'],
  [I + 'AuditoriaModal.tsx', 'label="BODEGA A AUDITAR"', 'el', 'auditoria.bodega'],
  [I + 'AuditoriaModal.tsx', 'label="AUDITOR RESPONSABLE"', 'el', 'auditoria.auditor'],
  [I + 'AuditoriaModal.tsx', 'label="MOTIVO / ALCANCE DE LA AUDITORÍA"', 'el', 'auditoria.motivo'],
  [I + 'MovimientoModal.tsx', 'BODEGA DE SALIDA (ORIGEN)', 'div', 'movimiento.origen'],
  [I + 'MovimientoModal.tsx', 'BODEGA DE ENTRADA (DESTINO)', 'div', 'movimiento.destino'],
  [I + 'MovimientoModal.tsx', 'USUARIO RESPONSABLE', 'div', 'movimiento.responsable'],
  [I + 'MovimientoModal.tsx', 'OBSERVACIONES / MOTIVO', 'div', 'movimiento.observaciones'],
  [C + 'ProveedorModal.tsx', 'label="NOMBRE O RAZÓN SOCIAL"', 'el', 'proveedor.nombre'],
  [C + 'ProveedorModal.tsx', 'label="NIT / DPI (IDENTIFICACIÓN TRIBUTARIA O PERSONAL)"', 'el', 'proveedor.nit'],
  [C + 'EstadoModal.tsx', 'label="NOMBRE DEL ESTADO"', 'el', 'estado.nombre'],
  [C + 'SolicitudCreacionView.tsx', '>Responsable</label>', 'div', 'solicitud.responsable'],
  [C + 'SolicitudCreacionView.tsx', '>Notas Adicionales</label>', 'div', 'solicitud.notas'],
  [C + 'AprobacionView.tsx', 'Motivo o Justificación del Rechazo', 'div', 'rechazo.motivo'],
  [C + 'MatrizCotizacionesView.tsx', 'JUSTIFICACIÓN <span', 'div', 'matriz.justificacion'],
  [C + 'ProveedorCotizacionCard.tsx', 'label="PROVEEDOR"', 'el', 'cotizacion.proveedor'],
];

const indentOf = (l) => l.match(/^\s*/)[0].length;
const avisos = [];
const cache = new Map();

function cargar(rel) {
  if (!cache.has(rel)) {
    const full = path.join(BASE, rel);
    if (!fs.existsSync(full)) { avisos.push(`NO EXISTE: ${full}`); cache.set(rel, null); return null; }
    const raw = fs.readFileSync(full, 'utf8');
    cache.set(rel, { full, crlf: raw.includes('\r\n'), lines: raw.replace(/\r\n/g, '\n').split('\n'), imports: new Set(), hechos: 0 });
  }
  return cache.get(rel);
}

for (const [rel, ancla, tipo, clave] of CAMPOS) {
  const f = cargar(rel);
  if (!f) continue;
  const L = f.lines;
  const hits = L.map((l, i) => (l.includes(ancla) ? i : -1)).filter((i) => i >= 0);
  if (hits.length !== 1) { avisos.push(`${rel}: "${ancla}" aparece ${hits.length} veces (se esperaba 1) -> hazlo a mano: ${clave}`); continue; }
  const a = hits[0];

  // 1) inicio del elemento
  let ini = a;
  if (tipo === 'el') {
    while (ini >= 0 && !/^\s*<(TextInput|Select)\b/.test(L[ini])) ini--;
  } else {
    while (ini >= 0 && !(/^\s*<div\b/.test(L[ini]) && indentOf(L[ini]) < indentOf(L[a]))) ini--;
  }
  if (ini < 0) { avisos.push(`${rel}: no encontré el inicio de ${clave}`); continue; }
  if (L[ini - 1] && L[ini - 1].includes('<FieldHint')) { f.imports.add('FieldHint'); continue; } // ya aplicado

  // 2) fin del elemento
  const ind = indentOf(L[ini]);
  let fin = ini + 1;
  const cierre = tipo === 'el' ? '/>' : '</div>';
  while (fin < L.length && !(L[fin].trim() === cierre && indentOf(L[fin]) === ind)) fin++;
  if (fin >= L.length) { avisos.push(`${rel}: no encontré el final de ${clave}`); continue; }

  // 3) envolver
  const pad = ' '.repeat(ind);
  const bloque = L.slice(ini, fin + 1).map((x) => (x ? '  ' + x : x));
  L.splice(ini, fin - ini + 1, `${pad}<FieldHint text={HINTS.${clave}}>`, ...bloque, `${pad}</FieldHint>`);
  f.imports.add('FieldHint');
  f.hechos++;
}

// Tarjeta de cotización: cambiar los "?" con title="" por el nuevo
const card = cargar(C + 'ProveedorCotizacionCard.tsx');
if (card) {
  let txt = card.lines.join('\n');
  const rx = /<span title="([^"]+)" className="text-slate-400">\s*<HelpCircle size=\{1[345]\} \/>\s*<\/span>/g;
  const n = (txt.match(rx) || []).length;
  if (n) {
    txt = txt.replace(rx, '<HintIcon text="$1" />');
    txt = txt.replace(/import \{([^}]*)\} from 'lucide-react';/, (m, names) => {
      const lista = names.split(',').map((s) => s.trim()).filter((s) => s && s !== 'HelpCircle');
      return `import { ${lista.join(', ')} } from 'lucide-react';`;
    });
    card.lines = txt.split('\n');
    card.hechos += n;
  }
  if (card.lines.some((l) => l.includes('<HintIcon'))) card.imports.add('HintIcon');
}

// Imports + guardar
for (const [rel, f] of cache) {
  if (!f) continue;
  if (f.imports.size) {
    const dir = path.dirname(path.join(BASE, rel));
    const rs = path.relative(dir, SHARED).split(path.sep).join('/');
    const rh = path.relative(dir, 'client/src/shared/hints').split(path.sep).join('/');
    const nombres = [...f.imports].sort();
    const L = f.lines;
    const txt = L.join('\n');
    if (!/from '[^']*shared\/components'/.test(txt)) {
      let j = -1;
      for (let i = 0; i < L.length; i++) if (/^import\b/.test(L[i])) { let k = i; while (!L[k].trimEnd().endsWith(';')) k++; j = k; i = k; }
      L.splice(j + 1, 0, `import { ${nombres.join(', ')} } from '${rs}';`);
    }
    if (nombres.includes('FieldHint') && !/from '[^']*shared\/hints'/.test(L.join('\n'))) {
      let j = -1;
      for (let i = 0; i < L.length; i++) if (/^import\b/.test(L[i])) { let k = i; while (!L[k].trimEnd().endsWith(';')) k++; j = k; i = k; }
      L.splice(j + 1, 0, `import { HINTS } from '${rh}';`);
    }
  }
  const salida = f.lines.join('\n');
  fs.writeFileSync(f.full, f.crlf ? salida.replace(/\n/g, '\r\n') : salida, 'utf8');
  console.log(`${f.hechos ? 'OK ' : '-- '} ${rel}  (${f.hechos} campos nuevos)`);
}
if (avisos.length) { console.log('\nREVISAR A MANO:'); avisos.forEach((a) => console.log(' - ' + a)); }
else console.log('\nListo, sin avisos.');