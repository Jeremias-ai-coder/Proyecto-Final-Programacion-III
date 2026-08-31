import { prisma } from '../config/prisma';

export class WebhookService {
  /**
   * Envía un evento webhook de forma asíncrona si el negocio tiene configurada una URL.
   * Pertenece a la capa de infraestructura / integraciones externas.
   * @param event Nombre del evento (ej: 'appointment.created')
   * @param businessId ID del negocio
   * @param payload Datos a enviar (usualmente el Appointment)
   */
  static async dispatch(event: string, businessId: number, payload: any): Promise<void> {
    // Ejecutar en background para no bloquear la respuesta HTTP principal
    setTimeout(async () => {
      try {
        const business = await prisma.business.findUnique({
          where: { id: businessId },
          select: { webhookUrl: true }
        });

        if (!business || !business.webhookUrl) {
          return; // El negocio no tiene webhook configurado
        }

        const body = JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          data: payload
        });

        const response = await fetch(business.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TurnosYa-Webhook-Bot/1.0'
          },
          body
        });

        if (!response.ok) {
          console.error(`[Webhook Error] URL: ${business.webhookUrl} | Status: ${response.status} | Event: ${event}`);
        } else {
          console.log(`[Webhook Success] Dispatched '${event}' to ${business.webhookUrl}`);
        }
      } catch (error) {
        console.error(`[Webhook Failure] Event: ${event} | Error:`, error);
      }
    }, 0);
  }
}
