import { IScheduleRepository, CreateScheduleDTO } from '../interfaces/schedule.interface';
import { IBusinessRepository } from '../interfaces/business.interface';
import { AppError } from '../middlewares/errorHandler';

function parseTimeToDate(timeStr: string): Date {
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    return new Date(`1970-01-01T${timeStr.length === 5 ? timeStr + ':00' : timeStr}Z`);
  }
  return new Date(timeStr);
}

export class ScheduleService {
  constructor(
    private scheduleRepo: IScheduleRepository,
    private businessRepo: IBusinessRepository
  ) {}

  async getSchedules(businessId: number) {
    const business = await this.businessRepo.findById(businessId);
    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }

    return this.scheduleRepo.findByBusinessId(businessId);
  }

  async createSchedule(businessId: number, userId: number, data: { dayOfWeek: number; startTime: string; endTime: string }) {
    const business = await this.businessRepo.findById(businessId);
    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }

    if (business.ownerId !== userId) {
      throw new AppError('No tienes permiso para modificar horarios de este negocio', 403);
    }

    return this.scheduleRepo.create({
      businessId,
      dayOfWeek: data.dayOfWeek,
      startTime: parseTimeToDate(data.startTime),
      endTime: parseTimeToDate(data.endTime)
    });
  }

  async updateSchedule(
    businessId: number,
    scheduleId: number,
    user: { id: number; role: string },
    data: { dayOfWeek?: number; startTime?: string; endTime?: string }
  ) {
    const business = await this.businessRepo.findById(businessId);
    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }

    if (business.ownerId !== user.id && user.role !== 'administrator') {
      throw new AppError('No tienes permiso para modificar horarios de este negocio', 403);
    }

    const existingSchedule = await this.scheduleRepo.findById(scheduleId);
    if (!existingSchedule || existingSchedule.businessId !== businessId) {
      throw new AppError('Horario no encontrado en este negocio', 404);
    }

    return this.scheduleRepo.update(scheduleId, {
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime ? parseTimeToDate(data.startTime) : undefined,
      endTime: data.endTime ? parseTimeToDate(data.endTime) : undefined
    });
  }

  async deleteSchedule(businessId: number, scheduleId: number, user: { id: number; role: string }) {
    const business = await this.businessRepo.findById(businessId);
    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }

    if (business.ownerId !== user.id && user.role !== 'administrator') {
      throw new AppError('No autorizado', 403);
    }

    await this.scheduleRepo.delete(scheduleId);
    return { message: 'Horario eliminado correctamente' };
  }
}
