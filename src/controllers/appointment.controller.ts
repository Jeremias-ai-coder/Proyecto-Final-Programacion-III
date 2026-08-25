import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { createAppointmentSchema, holdAppointmentSchema, cancelAppointmentSchema } from '../validators/appointment.validator';
import { WebhookService } from '../services/webhook.service';
import crypto from 'crypto';

const prisma = new PrismaClient();

const getDayOfWeek = (date: Date) => date.getUTCDay() === 0 ? 7 : date.getUTCDay();
const getTimeMinutes = (date: Date) => date.getUTCHours() * 60 + date.getUTCMinutes();

const validateSchedule = async (businessId: number, serviceId: number, date: string, time: string) => {
  const [service, schedules] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.schedule.findMany({ where: { businessId } })
  ]);

  if (!service || service.businessId !== businessId) {
    throw new AppError('Servicio no encontrado para este negocio', 400);
  }

  const appointmentDate = new Date(date);
  const appointmentTime = getTimeMinutes(new Date(time));
  const isWithinSchedule = schedules.some(schedule => {
    const startsAt = getTimeMinutes(schedule.startTime);
    const endsAt = getTimeMinutes(schedule.endTime);
    return schedule.dayOfWeek === getDayOfWeek(appointmentDate)
      && appointmentTime >= startsAt
      && appointmentTime + service.durationMinutes <= endsAt;
  });

  if (!isWithinSchedule) {
    throw new AppError('El horario seleccionado está fuera del horario de atención', 400);
  }
};

export class AppointmentController {
  static async holdAppointment(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const parsed = holdAppointmentSchema.safeParse(req.body);
    
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const { businessId, serviceId, date, time } = parsed.data;
    await validateSchedule(businessId, serviceId, date, time);

    const holdToken = crypto.randomUUID();
    // Expiración en 10 minutos
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        serviceId,
        userId,
        date: new Date(date),
        time: new Date(time),
        status: 'PENDING',
        holdToken,
        holdExpiresAt: expiresAt
      }
    });

    res.json({
      holdToken,
      expiresAt: expiresAt.toISOString()
    });
  }

  static async createAppointment(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const parsed = createAppointmentSchema.safeParse(req.body);
    
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const { businessId, serviceId, date, time, holdToken } = parsed.data;
    if (!holdToken) {
      await validateSchedule(businessId, serviceId, date, time);
    }

    if (holdToken) {
      // Buscar el appointment en hold
      const existingHold = await prisma.appointment.findFirst({
        where: { holdToken, status: 'PENDING' }
      });

      if (!existingHold || (existingHold.holdExpiresAt && existingHold.holdExpiresAt < new Date())) {
        throw new AppError('El bloqueo de turno ha expirado o es inválido', 400);
      }

      // Confirmar
      const confirmed = await prisma.appointment.update({
        where: { id: existingHold.id },
        data: { status: 'CONFIRMED', holdToken: null, holdExpiresAt: null }
      });

      WebhookService.dispatch('appointment.created', businessId, confirmed);

      return res.status(201).json(confirmed);
    }

    // Crear directo sin hold
    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        serviceId,
        userId,
        date: new Date(date),
        time: new Date(time),
        status: 'CONFIRMED'
      }
    });

    WebhookService.dispatch('appointment.created', businessId, appointment);

    res.status(201).json(appointment);
  }

  static async cancelAppointment(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const userId = (req as any).user.id;
    
    const parsed = cancelAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new AppError('Turno no encontrado', 404);
    }

    // Solo puede cancelar el dueño del negocio o el cliente (asumiremos cliente/admin)
    const cancelled = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledReason: parsed.data.reason,
        cancelledByUserId: parsed.data.cancelledByUserId || userId.toString()
      }
    });

    WebhookService.dispatch('appointment.cancelled', appointment.businessId, cancelled);

    res.json(cancelled);
  }

  static async getAppointments(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: { userId },
        skip,
        take: limit,
        include: { service: true, business: true }
      }),
      prisma.appointment.count({ where: { userId } })
    ]);

    res.json({
      data: appointments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  }
}
