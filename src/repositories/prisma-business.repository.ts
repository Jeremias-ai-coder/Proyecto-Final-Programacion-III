import { PrismaClient, Business } from '@prisma/client';
import { IBusinessRepository, CreateBusinessDTO, UpdateBusinessDTO } from '../interfaces/business.interface';

export class PrismaBusinessRepository implements IBusinessRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(skip: number, take: number): Promise<[any[], number]> {
    return Promise.all([
      this.prisma.business.findMany({
        skip,
        take,
        include: { owner: { select: { id: true, name: true, email: true } } }
      }),
      this.prisma.business.count()
    ]);
  }

  async findById(id: number): Promise<any | null> {
    return this.prisma.business.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true } } }
    });
  }

  async findByOwnerId(ownerId: number): Promise<Business[]> {
    return this.prisma.business.findMany({
      where: { ownerId }
    });
  }

  async create(ownerId: number, data: CreateBusinessDTO): Promise<Business> {
    return this.prisma.business.create({
      data: {
        ...data,
        ownerId
      }
    });
  }

  async update(id: number, data: UpdateBusinessDTO): Promise<Business> {
    return this.prisma.business.update({
      where: { id },
      data
    });
  }

  async count(): Promise<number> {
    return this.prisma.business.count();
  }
}
