export const HINTS = {
  // ---------- Inventario ----------
  marca: {
    nombre: 'Nombre comercial de la marca (ej. HP, Dell). Máximo 100 caracteres. No use símbolos como * / @ < >.',
  },
  categoria: {
    nombre: 'Grupo al que pertenecen los artículos (ej. Laptops, Papelería). Máximo 100 caracteres, sin símbolos especiales.',
  },
  bodega: {
    codigo: 'Código corto y único para identificar la bodega (ej. BOD-01). Solo mayúsculas, números, guiones y puntos. Máximo 20.',
    nombre: 'Nombre con el que el equipo reconoce la bodega (ej. Bodega Central). Máximo 100 caracteres.',
    direccion: 'Dónde está físicamente la bodega: km, calle, nave, zona. Máximo 250 caracteres.',
  },
  ubicacion: {
    codigo: 'Código único de la ubicación dentro de la bodega (ej. A-01-R2). Mayúsculas, números, guiones y puntos. Máximo 30.',
    pasillo: 'Pasillo donde está la ubicación (ej. P1). Máximo 20 caracteres.',
    rack: 'Estante o rack dentro del pasillo (ej. R2). Máximo 20 caracteres.',
    nivel: 'Altura dentro del rack (ej. N3). Máximo 20 caracteres.',
  },
  unidad: {
    nombre: 'Nombre completo de la unidad de medida (ej. KILOGRAMO, CAJA). Máximo 50 caracteres. No se puede repetir.',
    abreviatura: 'Símbolo corto de la unidad (ej. KG, L, M/S). Mayúsculas, números, puntos y "/". Máximo 10.',
  },
  tipoMovimiento: {
    codigo: 'Código único del tipo de movimiento (ej. REC_COMPRA). Solo mayúsculas, números y guion bajo. Máximo 20.',
    naturaleza: '"+" suma existencias al inventario (entradas). "-" las resta (salidas).',
    descripcion: 'Explique cuándo se usa este movimiento (ej. Recepción por orden de compra). Máximo 100 caracteres.',
  },
  articulo: {
    codigo: 'Código único del artículo (ej. ART-0010). Mayúsculas, números, guiones y puntos. Máximo 20. No se puede repetir ni cambiar después.',
    descripcion: 'Nombre claro del artículo con modelo o presentación (ej. Laptop HP ProBook 450 G9). Máximo 200 caracteres.',
    categoria: 'Grupo del catálogo al que pertenece. Si no aparece, créela primero en Categorías.',
    marca: 'Marca del fabricante. Si no aparece, créela primero en Marcas.',
    unidadCompra: 'Unidad en la que se compra al proveedor (ej. Caja).',
    unidadVenta: 'Unidad en la que se despacha o entrega (ej. Unidad).',
  },
  lote: {
    numero: 'Número o código impreso en el lote (ej. LOT-2026-A1). No se repite dentro del mismo artículo. Máximo 50.',
    codigoArticulo: 'Código del artículo al que pertenece el lote (ej. ART-001). Debe existir en el catálogo. Máximo 20.',
    fechaProduccion: 'Fecha en que se fabricó el producto. Debe ser anterior a la fecha de vencimiento.',
    fechaVencimiento: 'Fecha límite de uso. No puede ser anterior a la de producción.',
    estado: 'ACTIVO: disponible. BLOQUEADO: en cuarentena o inspección. VENCIDO: caducado. AGOTADO: sin existencias.',
  },
  auditoria: {
    bodega: 'Bodega que se va a contar. Solo puede haber una toma física en proceso por bodega.',
    auditor: 'Persona responsable de realizar y firmar el conteo.',
    motivo: 'Razón de la auditoría (ej. cierre de mes, conteo cíclico).',
  },
  movimiento: {
    origen: 'Bodega de donde sale la mercadería. Debe tener existencias suficientes.',
    destino: 'Bodega que recibe la mercadería. No puede ser la misma que la de salida.',
    responsable: 'Usuario que autoriza y responde por este traslado.',
    observaciones: 'Motivo del traslado (ej. reabastecimiento de sucursal). Ayuda a rastrear el movimiento después. Máximo 500 caracteres.',
  },

  // ---------- Compras ----------
  proveedor: {
    nombre: 'Nombre comercial o razón social del proveedor (ej. Distribuidora Central, S.A.). Máximo 150 caracteres.',
    nit: 'NIT o DPI del proveedor. Solo números, de 8 a 13 dígitos, sin guiones ni espacios.',
  },
  estado: {
    nombre: 'Nombre del estado del proceso (ej. PENDIENTE, APROBADO). Máximo 50 caracteres. No se puede repetir.',
  },
  solicitud: {
    responsable: 'Persona que solicita la compra y responde por ella.',
    notas: 'Contexto de la solicitud (ej. reabastecimiento urgente). Ayuda a quien la aprueba a decidir. Máximo 500 caracteres.',
  },
  rechazo: {
    motivo: 'Explique por qué se rechaza (ej. presupuesto insuficiente, solicitud duplicada). El solicitante lo verá.',
  },
  matriz: {
    justificacion: 'Explique por qué solo hay un proveedor disponible. Es obligatorio para poder continuar.',
  },
  cotizacion: {
    proveedor: 'Proveedor que envió esta cotización. Si no aparece, regístrelo primero en el catálogo de proveedores.',
  },
} as const;