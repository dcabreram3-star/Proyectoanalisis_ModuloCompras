import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../../config/index.js';
import { logger } from '../../../shared/logger.js';

let transporterInstance: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      requireTLS: !config.smtp.secure,
    });
  }
  return transporterInstance;
}

function esSmtpConfigurado(): boolean {
  return Boolean(config.smtp.host && config.smtp.host.trim() !== '');
}

/**
 * Función genérica de reintentos con retroceso exponencial (Exponential Backoff).
 */
async function ejecutarConReintentos<T>(
  operacion: () => Promise<T>,
  nombreOperacion: string,
  maxIntentos: number = 3,
  esperaInicialMs: number = 1000
): Promise<T> {
  let intento = 0;
  let espera = esperaInicialMs;

  while (intento < maxIntentos) {
    intento++;
    try {
      return await operacion();
    } catch (error: any) {
      console.warn(
        `[ComprasMailerService] Intento ${intento}/${maxIntentos} fallido para '${nombreOperacion}': ${error.message}`
      );
      if (intento >= maxIntentos) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, espera));
      espera *= 2; // Duplicar tiempo de espera para el siguiente intento
    }
  }
  throw new Error(`[ComprasMailerService] Se agotaron los ${maxIntentos} intentos para '${nombreOperacion}'.`);
}

export class ComprasMailerService {
  /**
   * Envía la Orden de Compra oficial al proveedor adjuntando el documento PDF binario.
   */
  static async enviarOrdenCompraProveedor(params: {
    noPo: string;
    emailProveedor: string;
    nombreProveedor: string;
    total: number;
    pdfBuffer: Buffer;
  }): Promise<boolean> {
    const { noPo, emailProveedor, nombreProveedor, total, pdfBuffer } = params;

    if (!esSmtpConfigurado()) {
      console.log(
        `\n[ComprasMailerService: MODO LOCAL] SMTP no configurado. Simulación de envío de PO ${noPo} a ${emailProveedor} (${nombreProveedor}) por Q${total.toFixed(2)}.`
      );
      return true;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">ORDEN DE COMPRA OFICIAL</h2>
          <p style="margin: 5px 0 0; font-size: 14px; color: #94a3b8;">Sistema ERP - Módulo de Compras</p>
        </div>
        <div style="padding: 24px;">
          <p>Estimado(s) <strong>${nombreProveedor}</strong>,</p>
          <p>Por este medio le hacemos entrega formal de la <strong>Orden de Compra #${noPo}</strong> autorizada por nuestra Gerencia Financiera.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>No. Orden de Compra:</strong> ${noPo}</p>
            <p style="margin: 4px 0;"><strong>Monto Total Autorizado:</strong> GTQ ${total.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style="margin: 4px 0;"><strong>Condición:</strong> Según cotización y plazos acordados</p>
          </div>
          <p>Adjunto a este correo encontrará el documento digital oficial en formato PDF debidamente rubricado para la preparación y despacho del pedido a nuestras bodegas.</p>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">Favor de confirmar la recepción de esta orden y la fecha programada de entrega.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
          Mensaje emitido automáticamente por el Sistema ERP. No responda a este remitente.
        </div>
      </div>
    `;

    try {
      await ejecutarConReintentos(
        async () => {
          const transporter = getTransporter();
          await transporter.sendMail({
            from: config.smtp.from,
            to: emailProveedor,
            subject: `[ERP Compras] Orden de Compra Oficial #${noPo} - ${nombreProveedor}`,
            html,
            attachments: [
              {
                filename: `Orden_Compra_${noPo}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ],
          });
        },
        `Envío de Orden de Compra ${noPo} a ${emailProveedor}`
      );
      return true;
    } catch (err: any) {
      console.error(`[ComprasMailerService Error]: No se pudo despachar el correo de PO ${noPo}:`, err.message);
      return false;
    }
  }

  /**
   * Notifica el rechazo de una Solicitud de Compra al usuario responsable o solicitante.
   */
  static async notificarRechazoSolicitud(params: {
    noDocumento: string;
    motivoRechazo: string;
    emailSolicitante?: string;
    nombreSolicitante?: string;
  }): Promise<boolean> {
    const { noDocumento, motivoRechazo, emailSolicitante, nombreSolicitante } = params;
    const destino = emailSolicitante || 'compras@localhost';

    if (!esSmtpConfigurado()) {
      console.log(
        `\n[ComprasMailerService: MODO LOCAL] Notificación de Rechazo de Solicitud ${noDocumento}: "${motivoRechazo}" (Destino: ${destino})`
      );
      return true;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #991b1b; color: #ffffff; padding: 18px; text-align: center;">
          <h2 style="margin: 0; font-size: 18px;">NOTIFICACIÓN DE RECHAZO DE SOLICITUD</h2>
        </div>
        <div style="padding: 24px;">
          <p>Hola <strong>${nombreSolicitante || 'Usuario'}</strong>,</p>
          <p>Le informamos que su <strong>Solicitud de Compra #${noDocumento}</strong> ha sido rechazada o denegada durante la etapa de revisión técnica/administrativa.</p>
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 14px; margin: 16px 0;">
            <p style="margin: 0 0 6px; font-weight: bold; color: #9f1239;">Motivo o Dictamen del Rechazo:</p>
            <p style="margin: 0; font-style: italic; color: #881337;">"${motivoRechazo}"</p>
          </div>
          <p style="font-size: 13px; color: #475569;">Si considera necesario reabrir o ajustar la solicitud con nuevas especificaciones, por favor genere un nuevo registro o comuníquese con el departamento de compras.</p>
        </div>
      </div>
    `;

    try {
      await ejecutarConReintentos(
        async () => {
          const transporter = getTransporter();
          await transporter.sendMail({
            from: config.smtp.from,
            to: destino,
            subject: `[ERP Compras] Solicitud de Compra #${noDocumento} Rechazada`,
            html,
          });
        },
        `Notificación de Rechazo Solicitud ${noDocumento}`
      );
      return true;
    } catch (err: any) {
      console.error(`[ComprasMailerService Error]: No se pudo enviar notificación de rechazo de solicitud:`, err.message);
      return false;
    }
  }

  /**
   * Notifica el rechazo de validación presupuestaria.
   */
  static async notificarRechazoPresupuesto(params: {
    noDocumento: string;
    motivoRechazo: string;
    emailResponsable?: string;
  }): Promise<boolean> {
    const { noDocumento, motivoRechazo, emailResponsable } = params;
    const destino = emailResponsable || 'compras@localhost';

    if (!esSmtpConfigurado()) {
      console.log(
        `\n[ComprasMailerService: MODO LOCAL] Notificación de Rechazo de Presupuesto para ${noDocumento}: "${motivoRechazo}"`
      );
      return true;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #fef3c7; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #d97706; color: #ffffff; padding: 18px; text-align: center;">
          <h2 style="margin: 0; font-size: 18px;">AJUSTE FINANCIERO / PRESUPUESTO RECHAZADO</h2>
        </div>
        <div style="padding: 24px;">
          <p>Se notifica que el presupuesto para la <strong>Solicitud de Compra #${noDocumento}</strong> ha sido denegado o devuelto para renegociación.</p>
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 14px; margin: 16px 0;">
            <p style="margin: 0 0 6px; font-weight: bold; color: #92400e;">Observaciones Presupuestarias:</p>
            <p style="margin: 0; color: #78350f;">"${motivoRechazo}"</p>
          </div>
        </div>
      </div>
    `;

    try {
      await ejecutarConReintentos(
        async () => {
          const transporter = getTransporter();
          await transporter.sendMail({
            from: config.smtp.from,
            to: destino,
            subject: `[ERP Presupuesto] Solicitud #${noDocumento} devuelta por Presupuesto`,
            html,
          });
        },
        `Notificación de Rechazo Presupuesto ${noDocumento}`
      );
      return true;
    } catch (err: any) {
      console.error(`[ComprasMailerService Error]: No se pudo enviar notificación de rechazo de presupuesto:`, err.message);
      return false;
    }
  }

  /**
   * Notifica alertas críticas (como discrepancias severas en 3-Way Match o fallas de integridad).
   */
  static async notificarAlertaCritica(params: {
    asunto: string;
    mensaje: string;
    modulo?: string;
    metadata?: any;
  }): Promise<boolean> {
    const { asunto, mensaje, modulo = 'Compras', metadata } = params;
    const destino = 'alertas-erp@localhost';

    if (!esSmtpConfigurado()) {
      console.log(`\n[ComprasMailerService ALERTA CRITICA]: [${modulo}] ${asunto} -> ${mensaje}`, metadata || '');
      return true;
    }

    try {
      await ejecutarConReintentos(
        async () => {
          const transporter = getTransporter();
          await transporter.sendMail({
            from: config.smtp.from,
            to: destino,
            subject: `[ALERTA CRITICA ERP - ${modulo}] ${asunto}`,
            text: `${mensaje}\n\nDetalles:\n${JSON.stringify(metadata, null, 2)}`,
          });
        },
        `Alerta Crítica: ${asunto}`
      );
      return true;
    } catch (err: any) {
      logger.error('compras_mailer_alerta_error', { error: err.message });
      return false;
    }
  }
}
