import { z } from 'zod';

export const createScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7, 'El día de la semana debe ser entre 1 (Lunes) y 7 (Domingo)'),
  startTime: z.string().min(1, 'La hora de apertura es requerida'),
  endTime: z.string().min(1, 'La hora de cierre es requerida')
});

export const updateScheduleSchema = createScheduleSchema.partial();

