import { IScheduleRepository, CreateScheduleDTO } from '../interfaces/schedule.interface';
import { IBusinessRepository } from '../interfaces/business.interface';
import { AppError } from '../middlewares/errorHandler';

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
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime)
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
