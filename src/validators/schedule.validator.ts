import { z } from 'zod';

export const createScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7, 'El día de la semana debe ser entre 1 (Lunes) y 7 (Domingo)'),
  startTime: z.string().datetime({ message: 'startTime debe ser una fecha/hora válida en formato ISO 8601' }),
  endTime: z.string().datetime({ message: 'endTime debe ser una fecha/hora válida en formato ISO 8601' })
});
