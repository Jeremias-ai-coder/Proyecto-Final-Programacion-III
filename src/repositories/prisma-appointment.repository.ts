import { PrismaClient, Appointment, AppointmentStatus } from '@prisma/client';
import {
  IAppointmentRepository,
  CreateHoldAppointmentDTO,
  CreateDirectAppointmentDTO,
  CancelAppointmentDTO,
  AppointmentFilterOptions
} from '../interfaces/appointment.interface';
import { isPastGracePeriod } from '../utils/date';

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

  async findById(id: number): Promise<any | null> {
    await this.autoCompleteExpiredAppointments(2);

    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        business: true,
        user: { select: { id: true, name: true, email: true } },
        review: true
      }
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

  async updateStatus(id: number, status: AppointmentStatus): Promise<Appointment> {
    return this.prisma.appointment.update({
      where: { id },
      data: { status }
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

  async findAppointments(options: AppointmentFilterOptions): Promise<[any[], number]> {
    await this.autoCompleteExpiredAppointments(2);

    const where: any = {};

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.businessId) {
      where.businessId = options.businessId;
    }

    if (options.date) {
      const dateStr = options.date.split('T')[0];
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
      where.date = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const skip = options.skip ?? 0;
    const take = options.take ?? 10;

    return Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        include: {
          service: true,
          business: true,
          user: { select: { id: true, name: true, email: true } },
          review: true
        },
        orderBy: [{ date: 'desc' }, { time: 'desc' }]
      }),
      this.prisma.appointment.count({ where })
    ]);
  }

  async findAll(take: number = 100): Promise<any[]> {
    await this.autoCompleteExpiredAppointments(2);

    return this.prisma.appointment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        business: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true } },
        review: true
      },
      orderBy: { createdAt: 'desc' },
      take
    });
  }

  async count(): Promise<number> {
    return this.prisma.appointment.count();
  }

  async autoCompleteExpiredAppointments(graceHours: number = 2): Promise<number> {
    try {
      const activeAppointments = await this.prisma.appointment.findMany({
        where: {
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] }
        },
        include: {
          service: { select: { durationMinutes: true } }
        }
      });

      const completedIds: number[] = [];
      for (const apt of activeAppointments) {
        const duration = apt.service?.durationMinutes ?? 30;
        if (isPastGracePeriod(apt.date, apt.time, duration, graceHours)) {
          completedIds.push(apt.id);
        }
      }

      if (completedIds.length > 0) {
        const result = await this.prisma.appointment.updateMany({
          where: { id: { in: completedIds } },
          data: {
            status: 'COMPLETED'
          }
        });
        return result.count;
      }
    } catch {
      // Silencioso
    }
    return 0;
  }

  async findBusySlotsByDate(businessId: number, date: string): Promise<string[]> {
    await this.autoCompleteExpiredAppointments(2);

    const dateStr = date.split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    const now = new Date();

    // Eliminar bloqueos temporales ya expirados
    try {
      await this.prisma.appointment.deleteMany({
        where: {
          status: 'PENDING',
          holdExpiresAt: { lte: now }
        }
      });
    } catch { /* ignore */ }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        OR: [
          { status: 'CONFIRMED' },
          { status: 'IN_PROGRESS' },
          { status: 'COMPLETED' },
          {
            status: 'PENDING',
            holdExpiresAt: { gt: now }
          }
        ]
      },
      select: {
        time: true
      }
    });

    return appointments.map(apt => apt.time.toISOString());
  }

  async isSlotBusy(businessId: number, date: Date, time: Date, excludeUserId?: number): Promise<boolean> {
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    const now = new Date();

    // Eliminar bloqueos temporales ya expirados
    try {
      await this.prisma.appointment.deleteMany({
        where: {
          status: 'PENDING',
          holdExpiresAt: { lte: now }
        }
      });
    } catch { /* ignore */ }

    const existing = await this.prisma.appointment.findFirst({
      where: {
        businessId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        time,
        OR: [
          { status: 'CONFIRMED' },
          { status: 'IN_PROGRESS' },
          { status: 'COMPLETED' },
          {
            status: 'PENDING',
            holdExpiresAt: { gt: now },
            ...(excludeUserId ? { userId: { not: excludeUserId } } : {})
          }
        ]
      }
    });

    return !!existing;
  }

  async clearPendingHolds(userId: number): Promise<void> {
    try {
      await this.prisma.appointment.deleteMany({
        where: {
          userId,
          status: 'PENDING'
        }
      });
    } catch { /* ignore */ }
  }
}
