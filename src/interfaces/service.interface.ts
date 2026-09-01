import { Service, Prisma } from '@prisma/client';

export interface CreateServiceDTO {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  bufferTime?: number;
  minCancellationNoticeHours?: number;
  allowReschedule?: boolean;
}

export interface IServiceRepository {
  findById(id: number): Promise<Service | null>;
  findByBusinessId(businessId: number): Promise<Service[]>;
  create(businessId: number, data: CreateServiceDTO): Promise<Service>;
  update(id: number, data: Partial<CreateServiceDTO>): Promise<Service>;
  delete(id: number): Promise<Service>;
}
