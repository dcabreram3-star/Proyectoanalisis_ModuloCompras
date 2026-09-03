// Repositorio del módulo de Recepciones de Bodega
import oracledb from 'oracledb';
import { runQuery, runTransaction } from '../../../shared/database.helper';
import {
  LineaPendienteRecepcion,
  RecepcionBodega,
  DetalleRecepcion,
  CrearRecepcionInput,
} from '../types/recepcion.types';

/**
 * Trae las líneas de una Orden de Compra junto con cuánto ya se ha recibido
 * en recepciones anteriores (para soportar entregas parciales) y cuánto
 * falta por recibir todavía.
 */
export async function findLineasPendientesPorPO(
  noPo: string
): Promise<LineaPendienteRecepcion[]> {
  const result = await runQuery<LineaPendienteRecepcion>(
    `SELECT
        doc.DOC_CODIGO_ARTICULO,
        art.ART_DESCRIPCION,
        doc.DOC_CANTIDAD_PEDIDA,
        doc.DOC_PRECIO_UNITARIO,
        NVL(SUM(dre.DRE_CANTIDAD_RECIBIDA), 0) AS CANTIDAD_YA_RECIBIDA,
        doc.DOC_CANTIDAD_PEDIDA - NVL(SUM(dre.DRE_CANTIDAD_RECIBIDA), 0) AS CANTIDAD_PENDIENTE
       FROM CMP_DETALLE_ORDEN_COMPRA doc
       JOIN CMP_ARTICULO art
         ON art.ART_CODIGO_ARTICULO = doc.DOC_CODIGO_ARTICULO
       LEFT JOIN CMP_RECEPCION_BODEGA rbo
         ON rbo.RBO_NO_PO = doc.DOC_NO_PO
       LEFT JOIN CMP_DETALLE_RECEPCION dre
         ON dre.DRE_NO_RECEPCION = rbo.RBO_NO_RECEPCION
        AND dre.DRE_CODIGO_ARTICULO = doc.DOC_CODIGO_ARTICULO
      WHERE doc.DOC_NO_PO = :noPo
      GROUP BY doc.DOC_CODIGO_ARTICULO, art.ART_DESCRIPCION,
               doc.DOC_CANTIDAD_PEDIDA, doc.DOC_PRECIO_UNITARIO
      ORDER BY doc.DOC_CODIGO_ARTICULO`,
    { noPo }
  );
  return result.rows ?? [];
}

/** Verifica que la Orden de Compra exista (para dar un error claro si no) */
export async function existeOrdenCompra(noPo: string): Promise<boolean> {
  const result = await runQuery<{ TOTAL: number }>(
    `SELECT COUNT(*) AS TOTAL FROM CMP_ORDEN_COMPRA WHERE OCO_NO_PO = :noPo`,
    { noPo }
  );
  return (result.rows?.[0]?.TOTAL ?? 0) > 0;
}

export async function findAllRecepciones(): Promise<RecepcionBodega[]> {
  const result = await runQuery<RecepcionBodega>(
    `SELECT RBO_NO_RECEPCION, RBO_NO_PO, RBO_ID_USUARIO_BODEGA, RBO_FECHA_RECEPCION,
            RBO_TIPO_RECEPCION, RBO_SUBTOTAL_RECIBIDO, RBO_IVA_RECIBIDO, RBO_TOTAL_FACTURAR
       FROM CMP_RECEPCION_BODEGA
      ORDER BY RBO_FECHA_RECEPCION DESC`
  );
  return result.rows ?? [];
}

export async function findRecepcionPorId(noRecepcion: string): Promise<RecepcionBodega | null> {
  const result = await runQuery<RecepcionBodega>(
    `SELECT RBO_NO_RECEPCION, RBO_NO_PO, RBO_ID_USUARIO_BODEGA, RBO_FECHA_RECEPCION,
            RBO_TIPO_RECEPCION, RBO_SUBTOTAL_RECIBIDO, RBO_IVA_RECIBIDO, RBO_TOTAL_FACTURAR
       FROM CMP_RECEPCION_BODEGA
      WHERE RBO_NO_RECEPCION = :noRecepcion`,
    { noRecepcion }
  );
  return result.rows && result.rows.length > 0 ? result.rows[0] : null;
}

export async function findDetallePorRecepcion(noRecepcion: string): Promise<DetalleRecepcion[]> {
  const result = await runQuery<DetalleRecepcion>(
    `SELECT dre.DRE_ID_DETALLE_RECEPCION, dre.DRE_NO_RECEPCION, dre.DRE_CODIGO_ARTICULO,
            art.ART_DESCRIPCION, dre.DRE_CANTIDAD_RECIBIDA, dre.DRE_VERIFICADO_FISICAMENTE
       FROM CMP_DETALLE_RECEPCION dre
       JOIN CMP_ARTICULO art ON art.ART_CODIGO_ARTICULO = dre.DRE_CODIGO_ARTICULO
      WHERE dre.DRE_NO_RECEPCION = :noRecepcion
      ORDER BY dre.DRE_ID_DETALLE_RECEPCION`,
    { noRecepcion }
  );
  return result.rows ?? [];
}

/**
 * Genera el siguiente código de recepción del año en curso, ej: "REC-2026-0001".
 * Debe llamarse DENTRO de la misma transacción de creación para minimizar
 * la posibilidad de que dos recepciones se generen con el mismo código.
 */
async function generarSiguienteCodigo(connection: oracledb.Connection): Promise<string> {
  const anio = new Date().getFullYear();
  const prefijo = `REC-${anio}-`;

  const result = await connection.execute<{ TOTAL: number }>(
    `SELECT COUNT(*) AS TOTAL FROM CMP_RECEPCION_BODEGA WHERE RBO_NO_RECEPCION LIKE :patron`,
    { patron: `${prefijo}%` },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const totalExistentes = result.rows?.[0]?.TOTAL ?? 0;
  const siguienteNumero = totalExistentes + 1;
  return `${prefijo}${String(siguienteNumero).padStart(4, '0')}`;
}

interface DatosCalculados {
  subtotal: number;
  iva: number;
  total: number;
}

/**
 * Crea la Recepción de Bodega completa (encabezado + líneas de detalle)
 * en una sola transacción: si algo falla a la mitad, no queda nada guardado.
 */
export async function crearRecepcion(
  data: CrearRecepcionInput,
  totales: DatosCalculados
): Promise<string> {
  return runTransaction(async (connection) => {
    const noRecepcion = await generarSiguienteCodigo(connection);

    await connection.execute(
      `INSERT INTO CMP_RECEPCION_BODEGA
         (RBO_NO_RECEPCION, RBO_NO_PO, RBO_ID_USUARIO_BODEGA, RBO_TIPO_RECEPCION,
          RBO_SUBTOTAL_RECIBIDO, RBO_IVA_RECIBIDO, RBO_TOTAL_FACTURAR)
       VALUES
         (:noRecepcion, :noPo, :idUsuarioBodega, :tipoRecepcion,
          :subtotal, :iva, :total)`,
      {
        noRecepcion,
        noPo: data.noPo,
        idUsuarioBodega: data.idUsuarioBodega,
        tipoRecepcion: data.tipoRecepcion,
        subtotal: totales.subtotal,
        iva: totales.iva,
        total: totales.total,
      }
    );

    for (const linea of data.detalle) {
      await connection.execute(
        `INSERT INTO CMP_DETALLE_RECEPCION
           (DRE_NO_RECEPCION, DRE_CODIGO_ARTICULO, DRE_CANTIDAD_RECIBIDA, DRE_VERIFICADO_FISICAMENTE)
         VALUES
           (:noRecepcion, :codigoArticulo, :cantidadRecibida, :verificado)`,
        {
          noRecepcion,
          codigoArticulo: linea.codigoArticulo,
          cantidadRecibida: linea.cantidadRecibida,
          verificado: linea.verificadoFisicamente ? 1 : 0,
        }
      );
    }

    return noRecepcion;
  });
}