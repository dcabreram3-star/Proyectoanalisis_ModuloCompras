import type { Tutorial } from '../../../shared/tutoriales';

export const COMPRAS_TUTORIALS: Tutorial[] = [
  // ═════════════════════════════════════════════════════════════════════════════
  // 1. NIVEL MACRO (Pipeline General del Ciclo de Compras)
  // ═════════════════════════════════════════════════════════════════════════════
  {
    id: 'compras-pipeline-overview',
    title: 'Flujo Integral de Compras (End-to-End)',
    summary: 'Recorre el ciclo completo de aprovisionamiento en sus 6 etapas formales: Requisición, Aprobación, Matriz de Cotizaciones, Selección, Presupuesto/PO, Recepción física y 3-Way Match.',
    modulo: 'compras',
    level: 'macro',
    group: 'pipeline',
    tab: 'registros',
    viewTestId: 'pipeline-overview',
    steps: [
      {
        title: 'El Ciclo Integral de Compras',
        body: 'El flujo de compras del ERP está gobernado por una máquina de estados estricta y trazable dividida en 6 etapas secuenciales. Cada adquisición avanza paso a paso sin omitir controles de presupuesto ni auditoría.',
        target: { testId: 'pipeline-overview' },
      },
      {
        title: 'Etapa 1: Solicitud y Aprobación',
        body: 'Inicio formal donde cualquier departamento registra su necesidad de bienes o insumos y pasa a revisión gerencial para autorizar o ajustar cantidades con dictamen obligatorio.',
        target: { testId: 'pipeline-stage-solicitud' },
      },
      {
        title: 'Etapa 2: Matriz de Cotizaciones',
        body: 'El equipo de compras analiza las ofertas comerciales de distintos proveedores para obtener las mejores condiciones de precio, crédito y tiempos de entrega.',
        target: { testId: 'pipeline-stage-matriz' },
      },
      {
        title: 'Etapa 3: Selección y Adjudicación',
        body: 'Evaluación comparativa de propuestas o justificación de proveedor único. Se declara formalmente la cotización GANADORA para avanzar al compromiso de pago.',
        target: { testId: 'pipeline-stage-seleccion' },
      },
      {
        title: 'Etapa 4: Presupuesto y Emisión de PO',
        body: 'Validación presupuestaria final del monto adjudicado. Se emite formalmente el documento PO oficial con cálculo automático de IVA y generación de PDF para el proveedor.',
        target: { testId: 'pipeline-stage-presupuesto' },
      },
      {
        title: 'Etapa 5: Recepción Física en Bodega',
        body: 'Ingreso al almacén donde el bodeguero verifica la mercancía física contra lo ordenado, registrando lote, ubicación y control de horario laboral autorizado (08:00 a 20:00 hrs).',
        target: { testId: 'pipeline-stage-bodega' },
      },
      {
        title: 'Etapa 6: Conciliación 3-Way Match',
        body: 'Cierre del ciclo: cotejo simultáneo de Factura vs Orden de Compra vs Recepción física. Al verificar discrepancia cero, la factura se liquida y pasa atómicamente a Cuentas por Pagar (CXP).',
        target: { testId: 'pipeline-stage-3way' },
      },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. NIVEL MICRO (Guías Específicas por Pantalla / Formulario)
  // ═════════════════════════════════════════════════════════════════════════════

  // 2.1 Pantalla de Listado de Solicitudes
  {
    id: 'compras-solicitud-lista',
    title: 'Bandeja y Listado de Solicitudes',
    summary: 'Aprende a navegar, buscar, filtrar por etapas y consultar el resumen y auditoría en tiempo real de cada compra.',
    modulo: 'compras',
    level: 'micro',
    group: 'solicitudes',
    tab: 'registros',
    viewTestId: 'compras-registros-view',
    steps: [
      {
        title: 'Bandeja Operativa de Solicitudes',
        body: 'En esta pantalla central encuentras todas las solicitudes en curso en el sistema, permitiendo su monitoreo continuo y acceso rápido a cada fase de trabajo.',
        target: { testId: 'compras-header' },
      },
      {
        title: 'Tarjetas de Indicadores en Vivo',
        body: 'Resumen en tiempo real del volumen de compras: total de solicitudes, aprobadas listas para cotizar, monto estimado presupuestado y solicitudes pendientes de autorización.',
        target: { testId: 'compras-kpis' },
      },
      {
        title: 'Filtro Dinámico por Etapas',
        body: 'Puedes hacer clic directamente en cualquiera de las 6 esferas del pipeline para filtrar al instante la lista por esa fase específica de avance.',
        target: { testId: 'pipeline-overview' },
      },
      {
        title: 'Búsqueda Rápida y Filtros de Estado',
        body: 'Utiliza la barra de búsqueda para ubicar solicitudes por número oficial (SOL-YYYY-XXXX) o palabras clave en las notas, o filtra por estado (Pendiente, Aprobada, etc.).',
        target: { testId: 'compras-search-toolbar' },
      },
      {
        title: 'Tabla Principal y Continuidad de Flujo',
        body: 'Cada fila muestra el solicitante, departamento, monto estimado, estado unificado y barra de progreso. Haz clic sobre el número de documento para ingresar directamente a su etapa activa.',
        target: { testId: 'tabla-solicitudes' },
      },
      {
        title: 'Resumen y Trazabilidad de Auditoría',
        body: 'El botón «Ver Detalle» abre una ventana completa con la bitácora inalterable del expediente, mostrando quién aprobó, qué proveedor cotizó y el historial de cambios.',
        target: { testId: 'btn-ver-detalle' },
      },
      {
        title: 'Nueva Solicitud de Compra',
        body: 'Usa este botón destacado para iniciar un nuevo proceso formal de requisición de insumos o materiales.',
        target: { testId: 'btn-nueva-solicitud' },
      },
    ],
  },

  // 2.2 Formulario / Modal de Creación de Solicitud (Ámbito Modal Estricto)
  {
    id: 'compras-solicitud-creacion',
    title: 'Creación de Solicitud de Compra',
    summary: 'Guía detallada dentro del formulario de registro: selección de departamento responsable, agregación de artículos existentes o nuevos y validaciones.',
    modulo: 'compras',
    level: 'micro',
    group: 'solicitudes',
    tab: 'registros',
    modalTestId: 'modal-crear-solicitud',
    steps: [
      {
        title: 'Formulario de Requisición',
        body: 'Este asistente te permite capturar los insumos necesarios para la operación departamental. Al guardar, el sistema asignará de forma atómica el folio SOL-YYYY-XXXX.',
        target: { testId: 'modal-crear-solicitud' },
      },
      {
        title: 'Responsable Solicitante',
        body: 'Selecciona al usuario responsable y departamento que origina la compra. Esto determina la partida presupuestaria que absorberá el gasto.',
        target: { testId: 'select-responsable-solicitud' },
      },
      {
        title: 'Notas y Justificación del Gasto',
        body: 'Describe brevemente el motivo de la requisición (ej. reabastecimiento mensual de oficina, mantenimiento de flota vehicular, etc.).',
        target: { testId: 'input-notas-solicitud' },
      },
      {
        title: 'Renglones de Artículos',
        body: 'Puedes agregar uno o múltiples renglones. Selecciona un artículo activo del catálogo maestro o marca la casilla «Ítem Nuevo» si se trata de un insumo que aún no existe en el catálogo.',
        target: { testId: 'contenedor-lineas-articulos' },
      },
      {
        title: 'Validación de Cantidad Requerida',
        body: 'La cantidad debe ser estrictamente un número entero positivo (> 0). El sistema bloquea caracteres inválidos (e, E, signos + o - y decimales) para garantizar la exactitud de almacén.',
        target: { testId: 'input-cantidad-articulo' },
      },
      {
        title: 'Añadir Más Artículos',
        body: 'Haz clic en «Añadir Línea» para incorporar otros artículos al mismo requerimiento sin necesidad de crear solicitudes separadas.',
        target: { testId: 'btn-agregar-linea-articulo' },
      },
      {
        title: 'Envío y Guardado Atómico',
        body: 'Al pulsar «Enviar Solicitud de Compra», el sistema valida todos los campos, genera el folio correlativo y sitúa la solicitud en la bandeja de Aprobación.',
        target: { testId: 'btn-guardar-solicitud' },
      },
    ],
  },

  // 2.3 Panel de Aprobación de Gerencia
  {
    id: 'compras-aprobacion',
    title: 'Validación y Aprobación de Gerencia',
    summary: 'Control de aprobación de solicitudes: ajuste de cantidades autorizadas, dictamen presupuestario y rechazo justificado.',
    modulo: 'compras',
    level: 'micro',
    group: 'aprobacion',
    tab: 'aprobacion',
    viewTestId: 'panel-aprobacion',
    steps: [
      {
        title: 'Panel de Aprobación Directiva',
        body: 'Aquí la jefatura o gerencia revisa la viabilidad operativa y financiera de la solicitud antes de que proceda a cotizarse en el mercado.',
        target: { testId: 'panel-aprobacion' },
      },
      {
        title: 'Revisión y Ajuste de Cantidades',
        body: 'Regla de negocio: la cantidad aprobada puede ser igual o menor a la solicitada, pero nunca excederla. Si no se dispone de suficiente presupuesto, reduzca la cantidad autorizada.',
        target: { testId: 'input-cantidad-aprobada' },
      },
      {
        title: 'Dictamen y Notas de Aprobación',
        body: 'Campo para ingresar instrucciones al comprador o la justificación de por qué se ajustaron o recortaron ciertas cantidades.',
        target: { testId: 'dictamen-aprobador' },
      },
      {
        title: 'Rechazo con Motivo Obligatorio',
        body: 'Si la solicitud es improcedente, el rechazo exige un motivo descriptivo claro (mínimo 10 caracteres) para garantizar la transparencia ante auditoría.',
        target: { testId: 'btn-rechazar-solicitud' },
      },
      {
        title: 'Aprobar y Avanzar a Cotización',
        body: 'Al confirmar la aprobación, la solicitud queda bloqueada contra cambios y pasa formalmente a la etapa de Cotizaciones y Matriz Comparativa.',
        target: { testId: 'btn-aprobar-solicitud' },
      },
    ],
  },

  // 2.4 Matriz de Cotizaciones y Adjudicación
  {
    id: 'compras-cotizaciones-matriz',
    title: 'Cotizaciones y Matriz de Adjudicación',
    summary: 'Carga de cotizaciones de proveedores, excepciones de proveedor único y selección de la oferta ganadora.',
    modulo: 'compras',
    level: 'micro',
    group: 'cotizaciones',
    tab: 'cotizaciones',
    viewTestId: 'matriz-cotizaciones-panel',
    steps: [
      {
        title: 'Matriz Comparativa Multiproveedor',
        body: 'Registra las propuestas económicas de diferentes proveedores para los artículos autorizados, comparando precio unitario, tiempo de entrega y crédito.',
        target: { testId: 'matriz-cotizaciones-panel' },
      },
      {
        title: 'Excepción de Proveedor Único',
        body: 'Si el artículo solo es comercializado por un proveedor exclusivo o se trata de una urgencia comprobada, marque esta casilla e ingrese la justificación obligatoria.',
        target: { testId: 'check-excepcion-unico' },
      },
      {
        title: 'Datos de la Oferta y Adjunto PDF',
        body: 'Para cada proveedor se captura el precio pactado, condiciones comerciales y se adjunta la cotización digital en PDF para respaldo del expediente.',
        target: { testId: 'proveedor-cotizacion-card' },
      },
      {
        title: 'Enviar a Selección y Adjudicar',
        body: 'Una vez completadas las propuestas, se avanza a la adjudicación donde se declara la cotización GANADORA para emitir la Orden de Compra.',
        target: { testId: 'btn-enviar-seleccion' },
      },
    ],
  },

  // 2.5 Emisión de Orden de Compra y PDF
  {
    id: 'compras-orden-compra',
    title: 'Emisión de Orden de Compra y PDF',
    summary: 'Validación presupuestaria final, emisión de la Orden de Compra (PO) oficial y generación/descarga del documento PDF.',
    modulo: 'compras',
    level: 'micro',
    group: 'presupuesto',
    tab: 'presupuesto',
    viewTestId: 'presupuesto-panel',
    steps: [
      {
        title: 'Panel Presupuestario y Emisión de PO',
        body: 'Último filtro antes del compromiso de pago. Se valida que el monto adjudicado se encuentre cubierto dentro del presupuesto disponible de la empresa.',
        target: { testId: 'presupuesto-panel' },
      },
      {
        title: 'Resumen de la Oferta Ganadora',
        body: 'Muestra la cotización adjudicada, el proveedor ganador, NIT, tiempos de entrega y condiciones de pago pactadas.',
        target: { testId: 'resumen-adjudicada-po' },
      },
      {
        title: 'Desglose Financiero con IVA',
        body: 'El sistema calcula automáticamente el Subtotal Neto, el Impuesto al Valor Agregado (12% IVA) y el Total Oficial a liquidar en la PO.',
        target: { testId: 'desglose-financiero-po' },
      },
      {
        title: 'Autorizar y Emitir Orden de Compra',
        body: 'Genera el correlativo oficial PO-YYYY-XXXX y traslada la solicitud a la etapa de Recepción Física en Almacén.',
        target: { testId: 'btn-emitir-orden-compra' },
      },
      {
        title: 'Visualización y Descarga del PDF Oficial',
        body: 'Genera e imprime el PDF con membrete corporativo, marcas de agua de estado y desglose de renglones para ser remitido al proveedor.',
        target: { testId: 'btn-imprimir-po' },
      },
    ],
  },

  // 2.6 Recepción Física en Almacén
  {
    id: 'compras-recepcion-bodega',
    title: 'Recepción Física en Bodega',
    summary: 'Inspección de material recibido, conteo físico, validación de ubicación y control de horario laboral autorizado.',
    modulo: 'compras',
    level: 'micro',
    group: 'bodega',
    tab: 'bodega',
    viewTestId: 'bodega-panel',
    steps: [
      {
        title: 'Recepción de Mercancía en Almacén',
        body: 'Control de entrada física para los insumos despachados por el proveedor con respaldo de la Orden de Compra.',
        target: { testId: 'bodega-panel' },
      },
      {
        title: 'Regla de Horario Laboral (08:00 a 20:00 hrs)',
        body: 'Estricto control de seguridad: las recepciones únicamente están autorizadas entre 8:00 AM y 8:00 PM. El sistema bloquea ingresos en horario nocturno o de madrugada.',
        target: { testId: 'banner-horario-laboral' },
      },
      {
        title: 'Bodega y Ubicación de Destino',
        body: 'Seleccione el almacén y la celda/rack específico donde quedará almacenado el material recibido.',
        target: { testId: 'select-bodega-destino' },
      },
      {
        title: 'Verificación Física de Cantidades',
        body: 'El encargado de bodega debe contar físicamente los bultos e ingresar la cantidad real recibida, la cual puede ser Total o Parcial.',
        target: { testId: 'tabla-items-recepcion' },
      },
      {
        title: 'Confirmar Ingreso y Generar Folio REC',
        body: 'Al confirmar, se emite el comprobante oficial REC-YYYY-XXXX, se actualiza el Kardex físico y el expediente avanza a la conciliación 3-Way Match.',
        target: { testId: 'btn-confirmar-recepcion' },
      },
    ],
  },

  // 2.7 Conciliación 3-Way Match
  {
    id: 'compras-three-way-match',
    title: 'Conciliación 3-Way Match y Pase a CXP',
    summary: 'Cotejo de Factura vs Orden de Compra vs Recepción de Bodega, bloqueo por discrepancias y liquidación hacia Cuentas por Pagar.',
    modulo: 'compras',
    level: 'micro',
    group: '3way',
    tab: 'matching',
    viewTestId: 'three-way-match-panel',
    steps: [
      {
        title: 'Módulo de Conciliación de Tres Vías',
        body: 'Garantía antifraude: compara simultáneamente lo que se ordenó (PO), lo que ingresó a bodega (REC) y lo que cobra la factura del proveedor (FAC).',
        target: { testId: 'three-way-match-panel' },
      },
      {
        title: 'Tarjetas de Cotejo Comparativo',
        body: 'Compara montos subtotales, IVA y totales entre los 3 documentos. Si existe alguna diferencia en cantidades o precios, el pase a pago queda estrictamente bloqueado.',
        target: { testId: 'tarjeta-tres-vias-comparativa' },
      },
      {
        title: 'Captura de Factura Tributaria',
        body: 'Ingresa la serie y número de la factura comercial emitida por el proveedor junto con la fecha fiscal del documento.',
        target: { testId: 'formulario-factura-proveedor' },
      },
      {
        title: 'Conciliación Renglón por Renglón',
        body: 'Tabla comparativa detallada por artículo: valida que el precio unitario facturado coincida exactamente con la cotización adjudicada.',
        target: { testId: 'tabla-conciliacion-lineas' },
      },
      {
        title: 'Liquidación y Pase a Cuentas por Pagar',
        body: 'Al verificar coincidencia total, se liquida la compra, se registra en CMP_FACTURA_CXP y la factura queda lista para su pago en el módulo de Cuentas por Pagar.',
        target: { testId: 'btn-liquidar-three-way-match' },
      },
    ],
  },
];

export const getComprasTutorial = (idOrTab: string): Tutorial =>
  COMPRAS_TUTORIALS.find((t) => t.id === idOrTab || t.tab === idOrTab) ?? COMPRAS_TUTORIALS[0];
