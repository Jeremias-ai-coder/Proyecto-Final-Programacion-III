import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { createScheduleSchema } from '../validators/schedule.validator';

const prisma = new PrismaClient();

export class ScheduleController {
  static async getSchedules(req: Request, res: Response) {
    const businessId = parseInt(req.params.id);

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }

    const schedules = await prisma.schedule.findMany({
      where: { businessId }
    });

    res.json(schedules);
  }

  static async createSchedule(req: Request, res: Response) {
    const businessId = parseInt(req.params.id);
    const userId = (req as any).user.id;

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }
    
    if (business.ownerId !== userId) {
      throw new AppError('No tienes permiso para modificar horarios de este negocio', 403);
    }

    const parsed = createScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const { dayOfWeek, startTime, endTime } = parsed.data;

    const schedule = await prisma.schedule.create({
      data: {
        businessId,
        dayOfWeek,
        startTime: new Date(startTime),
        endTime: new Date(endTime)
      }
    });

    res.status(201).json(schedule);
  }

  static async deleteSchedule(req: Request, res: Response) {
    const businessId = parseInt(req.params.id);
    const scheduleId = parseInt(req.params.scheduleId);
    const userId = (req as any).user.id;

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new AppError('Negocio no encontrado', 404);
    if (business.ownerId !== userId && (req as any).user.role !== 'administrator') {
      throw new AppError('No autorizado', 403);
    }

    await prisma.schedule.delete({ where: { id: scheduleId } });
    res.json({ message: 'Horario eliminado correctamente' });
  }
}
