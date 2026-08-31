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
    const user = (req as any).user;

    const parsed = cancelAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const cancelled = await this.appointmentService.cancelAppointment(id, user.id, user.role, parsed.data);
    res.json(cancelled);
  };

  updateStatus = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = (req as any).user;
    const { status } = req.body;

    if (!status) {
      throw new AppError('El campo status es requerido', 400);
    }

    const updated = await this.appointmentService.updateStatus(id, user.id, user.role, status);
    res.json(updated);
  };

  getAppointments = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const businessId = req.query.businessId ? parseInt(req.query.businessId as string) : undefined;
    const date = req.query.date as string | undefined;

    const result = await this.appointmentService.getAppointments({
      userId: user.id,
      userRole: user.role,
      page,
      limit,
      businessId,
      date
    });
    res.json(result);
  };

  getAppointmentById = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = (req as any).user;

    const appointment = await this.appointmentService.getAppointmentById(id, user.id, user.role);
    res.json(appointment);
  };

  getBusySlots = async (req: Request, res: Response) => {
    const businessId = parseInt(req.params.id || (req.query.businessId as string));
    const date = req.query.date as string;

    if (!businessId || isNaN(businessId)) {
      throw new AppError('businessId es requerido', 400);
    }

    const result = await this.appointmentService.getBusySlots(businessId, date);
    res.json(result);
  };
}
