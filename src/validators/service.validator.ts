import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(1, 'La duración debe ser mayor a 0').default(30),
  price: z.number().min(0, 'El precio no puede ser negativo').default(0),
  bufferTime: z.number().int().min(0).default(0),
  minCancellationNoticeHours: z.number().int().min(0).optional(),
  allowReschedule: z.boolean().default(true)
});

export const updateServiceSchema = createServiceSchema.partial();
