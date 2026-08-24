import { Request, Response } from 'express';
import { ScheduleService } from '../services/schedule.service';
import { createScheduleSchema } from '../validators/schedule.validator';
import { AppError } from '../middlewares/errorHandler';

export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  getSchedules = async (req: Request, res: Response) => {
    const businessId = parseInt(req.params.id);
    const schedules = await this.scheduleService.getSchedules(businessId);
    res.json(schedules);
  };

  createSchedule = async (req: Request, res: Response) => {
    const businessId = parseInt(req.params.id);
    const userId = (req as any).user.id;

    const parsed = createScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const schedule = await this.scheduleService.createSchedule(businessId, userId, parsed.data);
    res.status(201).json(schedule);
  };

  deleteSchedule = async (req: Request, res: Response) => {
    const businessId = parseInt(req.params.id);
    const scheduleId = parseInt(req.params.scheduleId);
    const user = (req as any).user;

    const result = await this.scheduleService.deleteSchedule(businessId, scheduleId, user);
    res.json(result);
  };
}
