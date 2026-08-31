import crypto from 'crypto';
import { IAppointmentRepository, CancelAppointmentDTO } from '../interfaces/appointment.interface';
import { WebhookService } from '../infrastructure/webhook.service';
import { AppError } from '../middlewares/errorHandler';
import { getPaginationOptions, createPaginatedResponse } from '../utils/pagination';

export class AppointmentService {
  constructor(private appointmentRepo: IAppointmentRepository) {}

  async holdAppointment(userId: number, data: { businessId: number; serviceId: number; date: string; time: string }) {
    const holdToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.appointmentRepo.createHold({
      businessId: data.businessId,
      serviceId: data.serviceId,
      userId,
      date: new Date(data.date),
      time: new Date(data.time),
      holdToken,
      holdExpiresAt: expiresAt
    });

    return {
      holdToken,
      expiresAt: expiresAt.toISOString()
    };
  }

  async createAppointment(userId: number, data: { businessId: number; serviceId: number; date: string; time: string; holdToken?: string }) {
    if (data.holdToken) {
      const existingHold = await this.appointmentRepo.findByHoldToken(data.holdToken);

      if (!existingHold || (existingHold.holdExpiresAt && existingHold.holdExpiresAt < new Date())) {
        throw new AppError('El bloqueo de turno ha expirado o es inválido', 400);
      }

      const confirmed = await this.appointmentRepo.confirmAppointment(existingHold.id);
      WebhookService.dispatch('appointment.created', data.businessId, confirmed);
      return confirmed;
    }

    const appointment = await this.appointmentRepo.createDirect({
      businessId: data.businessId,
      serviceId: data.serviceId,
      userId,
      date: new Date(data.date),
      time: new Date(data.time),
      status: 'CONFIRMED'
    });

    WebhookService.dispatch('appointment.created', data.businessId, appointment);
    return appointment;
  }

  async cancelAppointment(id: number, userId: number, data: { reason: string; cancelledByUserId?: string }) {
    const appointment = await this.appointmentRepo.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado', 404);
    }

    const cancelled = await this.appointmentRepo.cancelAppointment(id, {
      cancelledReason: data.reason,
      cancelledByUserId: data.cancelledByUserId || userId.toString()
    });

    WebhookService.dispatch('appointment.cancelled', appointment.businessId, cancelled);
    return cancelled;
  }

  async getAppointments(userId: number, page: number = 1, limit: number = 10) {
    const pagination = getPaginationOptions(page, limit, 50);
    const [appointments, total] = await this.appointmentRepo.findByUserId(
      userId,
      pagination.skip,
      pagination.limit
    );

    return createPaginatedResponse(appointments, total, pagination.page, pagination.limit);
  }
}
