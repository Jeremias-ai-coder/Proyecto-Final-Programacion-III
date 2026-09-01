import { PrismaClient, Service } from '@prisma/client';
import { IServiceRepository, CreateServiceDTO } from '../interfaces/service.interface';

export class PrismaServiceRepository implements IServiceRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: number): Promise<Service | null> {
    return this.prisma.service.findUnique({
      where: { id }
    });
  }

  async findByBusinessId(businessId: number): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: { businessId }
    });
  }

  async create(businessId: number, data: CreateServiceDTO): Promise<Service> {
    return this.prisma.service.create({
      data: {
        ...data,
        businessId
      }
    });
  }

  async update(id: number, data: Partial<CreateServiceDTO>): Promise<Service> {
    return this.prisma.service.update({
      where: { id },
      data
    });
  }

  async delete(id: number): Promise<Service> {
    return this.prisma.service.delete({
      where: { id }
    });
  }
}
