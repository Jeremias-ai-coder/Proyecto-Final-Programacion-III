import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'El rating mínimo es 1').max(5, 'El rating máximo es 5'),
  comment: z.string().max(1000, 'El comentario no puede superar los 1000 caracteres').optional().nullable()
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
