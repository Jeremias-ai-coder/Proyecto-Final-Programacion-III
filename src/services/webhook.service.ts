import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WebhookService {
  /**
   * Envía un evento webhook de forma asíncrona si el negocio tiene configurada una URL.
   * @param event Nombre del evento (ej: 'appointment.created')
   * @param businessId ID del negocio
   * @param payload Datos a enviar (usualmente el Appointment)
   */
  static async dispatch(event: string, businessId: number, payload: any) {
    // Ejecutar en background para no bloquear la request principal
    setTimeout(async () => {
      try {
        const business = await prisma.business.findUnique({
          where: { id: businessId },
          select: { webhookUrl: true }
        });

        if (!business || !business.webhookUrl) {
          return; // El negocio no tiene webhooks configurados
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
