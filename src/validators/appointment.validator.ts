import { z } from 'zod';

export const holdAppointmentSchema = z.object({
  businessId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  date: z.string().datetime({ message: 'date debe ser una fecha válida en formato ISO 8601' }),
  time: z.string().datetime({ message: 'time debe ser una fecha válida en formato ISO 8601' })
});

export const createAppointmentSchema = holdAppointmentSchema.extend({
  holdToken: z.string().optional()
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().min(1, 'El motivo de cancelación es requerido'),
  cancelledByUserId: z.string().optional()
});
