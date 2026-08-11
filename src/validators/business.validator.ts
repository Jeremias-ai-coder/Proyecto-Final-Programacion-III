import { z } from 'zod';

export const createBusinessSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  category: z.string().optional(),
  logoUrl: z.string().url('Debe ser una URL válida').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.string().optional(),
  webhookUrl: z.string().url('Debe ser una URL válida').optional()
});

export const updateBusinessSchema = createBusinessSchema.partial();
