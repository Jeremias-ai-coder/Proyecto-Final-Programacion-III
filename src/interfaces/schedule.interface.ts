import { Schedule } from '@prisma/client';

export interface CreateScheduleDTO {
  businessId: number;
  dayOfWeek: number;
  startTime: Date;
  endTime: Date;
}

export interface UpdateScheduleDTO {
  dayOfWeek?: number;
  startTime?: Date;
  endTime?: Date;
}

export interface IScheduleRepository {
  findByBusinessId(businessId: number): Promise<Schedule[]>;
  findById(id: number): Promise<Schedule | null>;
  create(data: CreateScheduleDTO): Promise<Schedule>;
  update(id: number, data: UpdateScheduleDTO): Promise<Schedule>;
  delete(id: number): Promise<Schedule>;
}
