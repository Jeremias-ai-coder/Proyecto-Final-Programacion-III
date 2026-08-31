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

export interface AppointmentFilterOptions {
  userId?: number;
  businessId?: number;
  date?: string;
  skip?: number;
  take?: number;
}

export interface IAppointmentRepository {
  createHold(data: CreateHoldAppointmentDTO): Promise<Appointment>;
  createDirect(data: CreateDirectAppointmentDTO): Promise<Appointment>;
  findById(id: number): Promise<any | null>;
  findByHoldToken(token: string): Promise<Appointment | null>;
  confirmAppointment(id: number): Promise<Appointment>;
  updateStatus(id: number, status: AppointmentStatus): Promise<Appointment>;
  cancelAppointment(id: number, data: CancelAppointmentDTO): Promise<Appointment>;
  findAppointments(options: AppointmentFilterOptions): Promise<[any[], number]>;
  findAll(take?: number): Promise<any[]>;
  count(): Promise<number>;
  autoCompleteExpiredAppointments(graceHours?: number): Promise<number>;
  findBusySlotsByDate(businessId: number, date: string): Promise<string[]>;
  isSlotBusy(businessId: number, date: Date, time: Date, excludeUserId?: number): Promise<boolean>;
  clearPendingHolds(userId: number): Promise<void>;
}
