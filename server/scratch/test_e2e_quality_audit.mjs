import { SolicitudCompraService } from 'file:///C:/Users/ANY%20ALVAREZ/Proyectoanalisis_ModuloCompras/server/dist/modules/compras/services/solicitudCompra.service.js';
import { CotizacionService } from 'file:///C:/Users/ANY%20ALVAREZ/Proyectoanalisis_ModuloCompras/server/dist/modules/compras/services/cotizacion.service.js';
import { OrdenCompraService } from 'file:///C:/Users/ANY%20ALVAREZ/Proyectoanalisis_ModuloCompras/server/dist/modules/compras/services/ordenCompra.service.js';
import { RecepcionBodegaService } from 'file:///C:/Users/ANY%20ALVAREZ/Proyectoanalisis_ModuloCompras/server/dist/modules/compras/services/recepcionBodega.service.js';
import { ThreeWayMatchService } from 'file:///C:/Users/ANY%20ALVAREZ/Proyectoanalisis_ModuloCompras/server/dist/modules/compras/services/threeWayMatch.service.js';
import { ArticuloRepository } from 'file:///C:/Users/ANY%20ALVAREZ/Proyectoanalisis_ModuloCompras/server/dist/modules/inventario/repositories/articulo.repository.js';
import { MovimientoInventarioService } from 'file:///C:/Users/ANY%20ALVAREZ/Proyectoanalisis_ModuloCompras/server/dist/modules/inventario/services/movimientoInventario.service.js';
import { TomaFisicaService } from 'file:///C:/Users/ANY%20ALVAREZ/Proyectoanalisis_ModuloCompras/server/dist/modules/inventario/services/tomaFisica.service.js';
import { execute } from 'file:///C:/Users/ANY%20ALVAREZ/Proyectoanalisis_ModuloCompras/server/dist/config/database.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function assertThrowsAsync(fn, message, expectedText) {
  totalTests++;
  try {
    await fn();
    failedTests++;
    console.error(`  [FAIL - Expected Exception] ${message}`);
  } catch (err) {
    if (expectedText && !err.message.toLowerCase().includes(expectedText.toLowerCase())) {
      failedTests++;
      console.error(`  [FAIL - Error message mismatch] ${message}: Expected substring "${expectedText}", got: "${err.message}"`);
    } else {
      passedTests++;
      console.log(`  [PASS - Expected Error Caught] ${message}: "${err.message.substring(0, 100)}..."`);
    }
  }
}

async function runE2EAudit() {
  console.log('================================================================');
  console.log('   AUDITORÍA QA END-TO-END: COMPRAS, INVENTARIO Y PRODUCTOS    ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // SECCIÓN 1: COMPRAS - SOLICITUD DE COMPRA Y FOLIO ATÓMICO
    // -------------------------------------------------------------------------
    console.log('>>> [1/7] AUDITORÍA DE SOLICITUD DE COMPRA Y FOLIO ATÓMICO');

    // 1.1 Rechazo de cantidades inválidas
    await assertThrowsAsync(
      () => SolicitudCompraService.crearSolicitud({
        idUsuarioResponsable: 1,
        idDepartamento: 1,
        notas: 'Auditoría QA',
        detalles: [{ codigoArticulo: 'ART-TEST-01', cantidadPedida: -5, isNuevo: false }]
      }),
      'Rechaza cantidad pedida negativa (-5)',
      'entero mayor o igual a 1'
    );

    await assertThrowsAsync(
      () => SolicitudCompraService.crearSolicitud({
        idUsuarioResponsable: 1,
        idDepartamento: 1,
        notas: 'Auditoría QA',
        detalles: [{ codigoArticulo: 'ART-TEST-01', cantidadPedida: 3.75, isNuevo: false }]
      }),
      'Rechaza cantidad pedida decimal (3.75)',
      'entero mayor o igual a 1'
    );

    // 1.2 Creación exitosa y folio atómico
    const solCreada1 = await SolicitudCompraService.crearSolicitud({
      idUsuarioResponsable: 1,
      idDepartamento: 1,
      notas: 'Auditoría QA - Solicitud 1',
      detalles: [
        {
          isNuevo: true,
          nombreArticuloNuevo: 'Laptop Empresarial Dell Precision QA',
          idCategoria: 1,
          idMarca: 1,
          idUnidadMedida: 1,
          cantidadPedida: 10
        }
      ]
    });

    const solCreada2 = await SolicitudCompraService.crearSolicitud({
      idUsuarioResponsable: 1,
      idDepartamento: 1,
      notas: 'Auditoría QA - Solicitud 2',
      detalles: [
        {
          isNuevo: true,
          nombreArticuloNuevo: 'Monitor IPS 27 Pulgadas QA',
          idCategoria: 1,
          idMarca: 1,
          idUnidadMedida: 1,
          cantidadPedida: 5
        }
      ]
    });

    assert(Boolean(solCreada1?.solNoDocumento), `Solicitud 1 creada con éxito: ${solCreada1.solNoDocumento}`);
    assert(Boolean(solCreada2?.solNoDocumento), `Solicitud 2 creada con éxito: ${solCreada2.solNoDocumento}`);
    assert(solCreada1.solNoDocumento !== solCreada2.solNoDocumento, 'Los folios son únicos y consecutivos (sin colisiones)');
    assert(/^SOL-\d{4}-\d{4}$/.test(solCreada1.solNoDocumento), `El folio cumple el formato atómico SOL-YYYY-XXXX (${solCreada1.solNoDocumento})`);

    const noSolAuditoria = solCreada1.solNoDocumento;

    // -------------------------------------------------------------------------
    // SECCIÓN 2: COMPRAS - APROBACIÓN Y TRAZABILIDAD
    // -------------------------------------------------------------------------
    console.log('\n>>> [2/7] AUDITORÍA DE APROBACIÓN Y TRAZABILIDAD (BITÁCORA)');

    const detallesSol = await SolicitudCompraService.obtenerDetalles(noSolAuditoria);
    assert(detallesSol.length > 0, `Detalles de solicitud recuperados (${detallesSol.length} artículos)`);
    const primerDetalle = detallesSol[0];

    // 2.1 Validación de límites de aprobación
    await assertThrowsAsync(
      () => SolicitudCompraService.aprobarSolicitud(noSolAuditoria, {
        detalles: [{ idDetalle: primerDetalle.dsoIdDetalleSolicitud, cantidadAprobada: 999 }]
      }),
      'Bloquea aprobación de cantidad que supera a la pedida (999 > 10)',
      'no puede superar a la cantidad solicitada'
    );

    // 2.2 Aprobación válida
    const solAprobada = await SolicitudCompraService.aprobarSolicitud(noSolAuditoria, {
      notasAprobacion: 'Aprobación formal por Gerencia QA',
      detalles: [{ idDetalle: primerDetalle.dsoIdDetalleSolicitud, cantidadAprobada: 10 }]
    });

    assert(
      solAprobada.solNombreEstado?.includes('Presupuesto') || solAprobada.solNotas?.includes('[APROBADA'),
      'La solicitud avanzó limpiamente hacia la validación presupuestaria'
    );

    // 2.3 Bloqueo de re-aprobación
    await assertThrowsAsync(
      () => SolicitudCompraService.aprobarSolicitud(noSolAuditoria, {
        detalles: [{ idDetalle: primerDetalle.dsoIdDetalleSolicitud, cantidadAprobada: 10 }]
      }),
      'Bloquea re-aprobación de solicitud ya aprobada',
      'ya fue aprobada'
    );

    // 2.4 Verificar registro en CMP_BITACORA_AUDITORIA
    const bitacoraRes = await execute(
      `SELECT COUNT(*) AS CNT FROM CMP_BITACORA_AUDITORIA WHERE BIT_ACCION = 'APROBACION_SOLICITUD'`
    );
    const countBitacora = Number(bitacoraRes.rows?.[0]?.CNT || 0);
    assert(countBitacora > 0, `Trazabilidad inalterable registrada en CMP_BITACORA_AUDITORIA (Registros: ${countBitacora})`);

    // -------------------------------------------------------------------------
    // SECCIÓN 3: COMPRAS - MATRIZ, SELECCIÓN Y ADJUDICACIÓN
    // -------------------------------------------------------------------------
    console.log('\n>>> [3/7] AUDITORÍA DE COTIZACIONES Y ADJUDICACIÓN (COMP-004)');

    const codArticulo = primerDetalle.dsoCodigoArticulo;

    // Guardar matriz de cotizaciones con 2 proveedores
    const cotizacionesGuardadas = await CotizacionService.guardarMatriz({
      noSolicitud: noSolAuditoria,
      cotizaciones: [
        {
          idProveedor: 1,
          precioTotal: 15000,
          tiempoEntregaDias: 5,
          condicionPagoDias: 30,
          detalles: [
            {
              codigoArticulo: codArticulo,
              cantidadCotizada: 10,
              precioUnitario: 1500,
              subtotalLinea: 15000
            }
          ]
        },
        {
          idProveedor: 21,
          precioTotal: 16500,
          tiempoEntregaDias: 3,
          condicionPagoDias: 15,
          detalles: [
            {
              codigoArticulo: codArticulo,
              cantidadCotizada: 10,
              precioUnitario: 1650,
              subtotalLinea: 16500
            }
          ]
        }
      ]
    });

    assert(cotizacionesGuardadas.length >= 2, `Matriz de cotizaciones guardada exitosamente (${cotizacionesGuardadas.length} ofertas)`);
    const cotGanadora = cotizacionesGuardadas[0];

    // Validación de pertenencia estricta: intentar adjudicar la cotización a una solicitud ajena
    await assertThrowsAsync(
      () => CotizacionService.adjudicarCotizacion(cotGanadora.cotIdCotizacion, solCreada2.solNoDocumento),
      'Bloquea adjudicación si la cotización no pertenece a la solicitud especificada',
      'pertenece a la solicitud'
    );

    // Adjudicación válida
    const adjudicada = await CotizacionService.adjudicarCotizacion(
      cotGanadora.cotIdCotizacion,
      noSolAuditoria,
      'Oferta con mejor costo/beneficio validada por el comité de compras'
    );

    assert(adjudicada.cotEstadoAdjudicacion === 'GANADORA', 'La cotización seleccionada quedó marcada como GANADORA');

    // -------------------------------------------------------------------------
    // SECCIÓN 4: COMPRAS - ORDEN DE COMPRA Y RECEPCIÓN EN BODEGA
    // -------------------------------------------------------------------------
    console.log('\n>>> [4/7] AUDITORÍA DE ORDEN DE COMPRA Y HORARIOS DE RECEPCIÓN (08:00 A 20:00)');

    const ordenCompra = await OrdenCompraService.autorizarPresupuesto({
      noDocumento: noSolAuditoria,
      idCotizacionGanadora: cotGanadora.cotIdCotizacion,
      notasAutorizacion: 'Presupuesto QA 2026 autorizado'
    });

    assert(Boolean(ordenCompra?.ocoNoPo), `Orden de Compra emitida formalmente: ${ordenCompra.ocoNoPo} (Total: Q${ordenCompra.ocoTotal})`);
    const noPo = ordenCompra.ocoNoPo;

    // 4.1 Prueba de restricción de horario: Madrugada (05:30 AM)
    const fechaMadrugada = new Date();
    fechaMadrugada.setHours(5, 30, 0, 0);
    const isoMadrugada = fechaMadrugada.toISOString().split('T')[0] + 'T05:30:00';

    await assertThrowsAsync(
      () => RecepcionBodegaService.registrarRecepcion({
        noPo,
        idBodega: 1,
        fechaLlegada: isoMadrugada,
        items: [{ codigoArticulo: codArticulo, cantidadRecibida: 10 }]
      }),
      'Rechaza recepción fuera de rango: Madrugada (05:30 hrs)',
      'Horario no autorizado (Madrugada)'
    );

    // 4.2 Prueba de restricción de horario: Nocturno (22:45 PM)
    const fechaNoche = new Date();
    fechaNoche.setHours(22, 45, 0, 0);
    const isoNoche = fechaNoche.toISOString().split('T')[0] + 'T22:45:00';

    await assertThrowsAsync(
      () => RecepcionBodegaService.registrarRecepcion({
        noPo,
        idBodega: 1,
        fechaLlegada: isoNoche,
        items: [{ codigoArticulo: codArticulo, cantidadRecibida: 10 }]
      }),
      'Rechaza recepción fuera de rango: Nocturno (22:45 hrs)',
      'Horario no autorizado (Nocturno)'
    );

    // 4.3 Recepción dentro del horario permitido: Tarde (14:15 hrs)
    const fechaValida = new Date();
    fechaValida.setHours(14, 15, 0, 0);
    const isoValida = fechaValida.toISOString().split('T')[0] + 'T14:15:00';

    const recepcion = await RecepcionBodegaService.registrarRecepcion({
      noPo,
      idBodega: 1,
      fechaLlegada: isoValida,
      idUsuarioBodega: 1,
      items: [
        {
          codigoArticulo: codArticulo,
          cantidadPedida: 10,
          cantidadRecibida: 10,
          costoUnitario: 1500
        }
      ]
    });

    assert(Boolean(recepcion?.rboNoRecepcion), `Recepción física procesada exitosamente: ${recepcion.rboNoRecepcion} (Estado: ${recepcion.rboTipoRecepcion})`);
    const noRecepcion = recepcion.rboNoRecepcion;

    // -------------------------------------------------------------------------
    // SECCIÓN 5: COMPRAS - 3-WAY MATCHING Y ESCRITURA EN CXP
    // -------------------------------------------------------------------------
    console.log('\n>>> [5/7] AUDITORÍA DE 3-WAY MATCHING Y ESCRITURA ATÓMICA EN CXP');

    // 5.1 Bloqueo por discrepancia en cantidad
    await assertThrowsAsync(
      () => ThreeWayMatchService.liquidarThreeWayMatch({
        noDocumentoSolicitud: noSolAuditoria,
        noPo,
        noRecepcion,
        noFactura: 'FAC-ERR-001',
        idProveedor: 1,
        totalFactura: 15000,
        subtotalFactura: 15000,
        montoIvaFactura: 0,
        items: [
          {
            codigoArticulo: codArticulo,
            cantidadFacturada: 8, // Discrepancia: se recibieron 10
            precioUnitarioFactura: 1500,
            subtotalFactura: 12000,
            resultadoTresVias: 'DISCREPANCIA_CANTIDAD',
            diferenciaCantidad: -2,
            diferenciaPrecio: 0
          }
        ]
      }),
      'Bloquea 3-Way Match con discrepancia de cantidad (8 != 10)',
      'Bloqueo de Integridad 3-Way Match'
    );

    // 5.2 Bloqueo por discrepancia en precio/monto
    await assertThrowsAsync(
      () => ThreeWayMatchService.liquidarThreeWayMatch({
        noDocumentoSolicitud: noSolAuditoria,
        noPo,
        noRecepcion,
        noFactura: 'FAC-ERR-002',
        idProveedor: 1,
        totalFactura: 25000, // Discrepancia de monto (25000 != ordenCompra.ocoTotal)
        subtotalFactura: 25000,
        montoIvaFactura: 0,
        items: [
          {
            codigoArticulo: codArticulo,
            cantidadFacturada: 10,
            precioUnitarioFactura: 2500,
            subtotalFactura: 25000,
            resultadoTresVias: 'DISCREPANCIA_PRECIO',
            diferenciaCantidad: 0,
            diferenciaPrecio: 1000
          }
        ]
      }),
      'Bloquea 3-Way Match con discrepancia en precio (Q2500 != Q1500)',
      'Bloqueo de Integridad 3-Way Match'
    );

    // 5.3 Liquidación Conforme: Escribe atómicamente en Cuentas por Pagar
    const noFacturaOficial = `FAC-QA-${Date.now().toString().slice(-8)}`;
    const matchLiquidado = await ThreeWayMatchService.liquidarThreeWayMatch({
      noDocumentoSolicitud: noSolAuditoria,
      noPo,
      noRecepcion,
      noFactura: noFacturaOficial,
      idProveedor: 1,
      totalFactura: ordenCompra.ocoTotal,
      subtotalFactura: ordenCompra.ocoSubtotal,
      montoIvaFactura: ordenCompra.ocoMontoIva,
      items: [
        {
          codigoArticulo: codArticulo,
          cantidadFacturada: 10,
          precioUnitarioFactura: 1500,
          subtotalFactura: ordenCompra.ocoSubtotal,
          resultadoTresVias: 'CONFORME',
          diferenciaCantidad: 0,
          diferenciaPrecio: 0
        }
      ]
    });

    assert(matchLiquidado.estadoCiclo === 'LIQUIDADO_CXP', 'Ciclo 3-Way Match cerrado y marcado como LIQUIDADO_CXP');

    // Verificar inserción atómica en CXP_DOCUMENTO
    const cxpDocRes = await execute(
      `SELECT ID_DOCUMENTO, NO_FACTURA_COMPRA, TOTAL_NETO, RESULTADO_TRES_VIAS FROM CXP_DOCUMENTO WHERE NO_FACTURA_COMPRA = :noFac`,
      { noFac: noFacturaOficial }
    );
    assert((cxpDocRes.rows || []).length === 1, `Documento registrado atómicamente en CXP_DOCUMENTO con factura ${noFacturaOficial}`);
    assert(cxpDocRes.rows?.[0]?.RESULTADO_TRES_VIAS === 'COINCIDE', 'Registro en CXP marcado con RESULTADO_TRES_VIAS = COINCIDE');

    // -------------------------------------------------------------------------
    // SECCIÓN 6: INVENTARIO - CATÁLOGO DE ARTÍCULOS Y PAGINACIÓN
    // -------------------------------------------------------------------------
    console.log('\n>>> [6/7] AUDITORÍA DE CATÁLOGO DE ARTÍCULOS, PAGINACIÓN Y FILTROS');

    // 6.1 Paginación
    const respPaginada = await ArticuloRepository.obtenerTodos({ page: 1, limit: 5 });
    assert(Boolean(respPaginada && typeof respPaginada === 'object' && 'data' in respPaginada), 'La respuesta tiene estructura paginada IArticulosPaginadosResponse');
    assert('total' in respPaginada && typeof respPaginada.total === 'number', `Conteo total de artículos obtenido (${respPaginada.total})`);
    assert('totalPages' in respPaginada && respPaginada.page === 1, `Páginas calculadas correctamente (Total Pages: ${respPaginada.totalPages})`);

    // 6.2 Filtros de búsqueda
    const respBusqueda = await ArticuloRepository.obtenerTodos({ search: 'Precision QA', page: 1, limit: 10 });
    const itemsBusqueda = respBusqueda && 'data' in respBusqueda ? respBusqueda.data : respBusqueda;
    assert(
      itemsBusqueda.some((a) => (a.artDescripcion || a.ART_DESCRIPCION)?.includes('Precision QA')),
      'Filtro de búsqueda por texto encuentra el artículo recién creado'
    );

    // 6.3 Retrocompatibilidad sin paginación
    const respPlana = await ArticuloRepository.obtenerTodos();
    assert(Array.isArray(respPlana), 'La llamada sin parámetros de paginación devuelve un arreglo plano IArticulo[] retrocompatible');

    // -------------------------------------------------------------------------
    // SECCIÓN 7: INVENTARIO - MOVIMIENTOS Y TOMA FÍSICA
    // -------------------------------------------------------------------------
    console.log('\n>>> [7/7] AUDITORÍA DE MOVIMIENTOS DE INVENTARIO Y TOMA FÍSICA (INV-002, INV-003, INV-012)');

    // 7.1 Validación estricta de movimientos
    await assertThrowsAsync(
      () => MovimientoInventarioService.crearMovimiento({
        tipoMovimiento: 'AJU_ENTRADA',
        idBodegaOrigen: 1,
        idUsuario: 1,
        detalles: [{ codigoArticulo: codArticulo, cantidad: -10, costoUnitario: 100 }]
      }),
      'Bloquea movimiento con cantidad negativa (-10)',
      'entero y positivo mayor a 0'
    );

    await assertThrowsAsync(
      () => MovimientoInventarioService.crearMovimiento({
        tipoMovimiento: 'MOV_INVENTADO_DESCONOCIDO',
        idBodegaOrigen: 1,
        idUsuario: 1,
        detalles: [{ codigoArticulo: codArticulo, cantidad: 5, costoUnitario: 100 }]
      }),
      'Bloquea movimiento con tipo no soportado',
      'no permitido'
    );

    // 7.2 Movimiento de ajuste válido
    const movValido = await MovimientoInventarioService.crearMovimiento({
      tipoMovimiento: 'AJU_ENTRADA',
      idBodegaOrigen: 1,
      idUsuario: 1,
      observaciones: 'Ajuste inicial de auditoría QA',
      detalles: [{ codigoArticulo: codArticulo, cantidad: 5, costoUnitario: 1500 }]
    });

    assert(Boolean(movValido?.noMovimiento), `Movimiento de ajuste registrado con éxito: ${movValido.noMovimiento}`);

    // 7.3 Toma Física: Apertura, conteo, sincronización atómica y cierre
    // Asegurar que no haya tomas abiertas previas en la bodega de prueba
    await execute(`UPDATE CMP_TOMA_FISICA SET TOM_ESTADO = 'CANCELADA' WHERE TOM_ID_BODEGA = 1 AND TOM_ESTADO = 'ABIERTA'`, {}, { autoCommit: true });

    const resApertura = await TomaFisicaService.aperturar({
      idBodega: 1,
      idUsuario: 1,
      observaciones: 'Auditoría Física Trimestral QA'
    });

    assert(resApertura.success && Boolean(resApertura.idToma), `Toma física aperturada exitosamente (ID #${resApertura.idToma})`);
    const idToma = resApertura.idToma;

    // Rechazo de conteo negativo en toma física
    await assertThrowsAsync(
      () => TomaFisicaService.guardarConteo({
        idToma,
        idUsuario: 1,
        detalles: [{ codigoArticulo: codArticulo, stockFisico: -1 }]
      }),
      'Rechaza conteo físico negativo (-1) en toma física',
      'no puede ser negativo'
    );

    // Conteo válido con diferencia para forzar ajuste automático
    const resConteo = await TomaFisicaService.guardarConteo({
      idToma,
      idUsuario: 1,
      detalles: [{ codigoArticulo: codArticulo, stockFisico: 20 }] // Conteo físico ajustado
    });

    assert(resConteo.success, `Conteo guardado y toma cerrada exitosamente (${resConteo.message})`);

    // Verificar existencias sincronizadas en CMP_INVENTARIO
    const invRes = await execute(
      `SELECT INV_EXISTENCIA_ACTUAL FROM CMP_INVENTARIO WHERE INV_CODIGO_ARTICULO = :codArt AND INV_ID_BODEGA = 1`,
      { codArt: codArticulo }
    );
    const stockActual = Number(invRes.rows?.[0]?.INV_EXISTENCIA_ACTUAL || 0);
    assert(stockActual === 20, `Existencia en CMP_INVENTARIO sincronizada exactamente al conteo físico (Stock = 20)`);

    console.log('\n================================================================');
    console.log(` RESULTADOS FINALES DE AUDITORÍA: ${passedTests}/${totalTests} PRUEBAS EXITOSAS`);
    if (failedTests === 0) {
      console.log(' ESTADO GENERAL: ✅ TODOS LOS FLUJOS INTEGRADOS CONFORMES AL 100%');
    } else {
      console.log(` ESTADO GENERAL: ⚠️ ${failedTests} PRUEBA(S) CON OBSERVACIONES`);
    }
    console.log('================================================================\n');

    process.exit(failedTests === 0 ? 0 : 1);
  } catch (err) {
    console.error('\n[FATAL ERROR]: Error no controlado durante la auditoría E2E:', err);
    process.exit(1);
  }
}

runE2EAudit();
