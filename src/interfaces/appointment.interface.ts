import { Appointment, AppointmentStatus } from '@prisma/client';

export interface CreateHoldAppointmentDTO {
  businessId: number;
  serviceId: number;
  userId: number;
  date: Date;
  time: Date;
  holdToken: string;
  holdExpiresAt: Date;
}

export interface CreateDirectAppointmentDTO {
  businessId: number;
  serviceId: number;
  userId: number;
  date: Date;
  time: Date;
  status: AppointmentStatus;
}

export interface CancelAppointmentDTO {
  cancelledReason: string;
  cancelledByUserId?: string;
}

export interface IAppointmentRepository {
  createHold(data: CreateHoldAppointmentDTO): Promise<Appointment>;
  createDirect(data: CreateDirectAppointmentDTO): Promise<Appointment>;
  findById(id: number): Promise<Appointment | null>;
  findByHoldToken(token: string): Promise<Appointment | null>;
  confirmAppointment(id: number): Promise<Appointment>;
  cancelAppointment(id: number, data: CancelAppointmentDTO): Promise<Appointment>;
  findByUserId(userId: number, skip: number, take: number): Promise<[any[], number]>;
  findAll(take?: number): Promise<any[]>;
  count(): Promise<number>;
}
