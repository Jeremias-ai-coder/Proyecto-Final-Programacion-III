import { PrismaClient, Schedule } from '@prisma/client';
import { IScheduleRepository, CreateScheduleDTO, UpdateScheduleDTO } from '../interfaces/schedule.interface';

export class PrismaScheduleRepository implements IScheduleRepository {
  constructor(private prisma: PrismaClient) {}

  async findByBusinessId(businessId: number): Promise<Schedule[]> {
    return this.prisma.schedule.findMany({
      where: { businessId },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });
  }

  async findById(id: number): Promise<Schedule | null> {
    return this.prisma.schedule.findUnique({
      where: { id }
    });
  }

  async create(data: CreateScheduleDTO): Promise<Schedule> {
    return this.prisma.schedule.create({
      data: {
        businessId: data.businessId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime
      }
    });
  }

  async update(id: number, data: UpdateScheduleDTO): Promise<Schedule> {
    return this.prisma.schedule.update({
      where: { id },
      data
    });
  }

  async delete(id: number): Promise<Schedule> {
    return this.prisma.schedule.delete({
      where: { id }
    });
  }
}
