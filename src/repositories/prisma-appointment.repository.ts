import { PrismaClient, Appointment } from '@prisma/client';
import {
  IAppointmentRepository,
  CreateHoldAppointmentDTO,
  CreateDirectAppointmentDTO,
  CancelAppointmentDTO
} from '../interfaces/appointment.interface';

export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private prisma: PrismaClient) {}

  async createHold(data: CreateHoldAppointmentDTO): Promise<Appointment> {
    return this.prisma.appointment.create({
      data: {
        businessId: data.businessId,
        serviceId: data.serviceId,
        userId: data.userId,
        date: data.date,
        time: data.time,
        status: 'PENDING',
        holdToken: data.holdToken,
        holdExpiresAt: data.holdExpiresAt
      }
    });
  }

  async createDirect(data: CreateDirectAppointmentDTO): Promise<Appointment> {
    return this.prisma.appointment.create({
      data: {
        businessId: data.businessId,
        serviceId: data.serviceId,
        userId: data.userId,
        date: data.date,
        time: data.time,
        status: data.status
      }
    });
  }

  async findById(id: number): Promise<Appointment | null> {
    return this.prisma.appointment.findUnique({
      where: { id }
    });
  }

  async findByHoldToken(token: string): Promise<Appointment | null> {
    return this.prisma.appointment.findFirst({
      where: { holdToken: token, status: 'PENDING' }
    });
  }

  async confirmAppointment(id: number): Promise<Appointment> {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        holdToken: null,
        holdExpiresAt: null
      }
    });
  }

  async cancelAppointment(id: number, data: CancelAppointmentDTO): Promise<Appointment> {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledReason: data.cancelledReason,
        cancelledByUserId: data.cancelledByUserId
      }
    });
  }

  async findByUserId(userId: number, skip: number, take: number): Promise<[any[], number]> {
    return Promise.all([
      this.prisma.appointment.findMany({
        where: { userId },
        skip,
        take,
        include: { service: true, business: true }
      }),
      this.prisma.appointment.count({ where: { userId } })
    ]);
  }

  async findAll(take: number = 100): Promise<any[]> {
    return this.prisma.appointment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        business: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true } }
      },
      orderBy: { createdAt: 'desc' },
      take
    });
  }

  async count(): Promise<number> {
    return this.prisma.appointment.count();
  }
}
