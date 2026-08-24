import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service';
import {
  createAppointmentSchema,
  holdAppointmentSchema,
  cancelAppointmentSchema
} from '../validators/appointment.validator';
import { AppError } from '../middlewares/errorHandler';

export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  holdAppointment = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const parsed = holdAppointmentSchema.safeParse(req.body);

    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const result = await this.appointmentService.holdAppointment(userId, parsed.data);
    res.json(result);
  };

  createAppointment = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const parsed = createAppointmentSchema.safeParse(req.body);

    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const appointment = await this.appointmentService.createAppointment(userId, parsed.data);
    res.status(201).json(appointment);
  };

  cancelAppointment = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const userId = (req as any).user.id;

    const parsed = cancelAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const cancelled = await this.appointmentService.cancelAppointment(id, userId, parsed.data);
    res.json(cancelled);
  };

  getAppointments = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.appointmentService.getAppointments(userId, page, limit);
    res.json(result);
  };
}
