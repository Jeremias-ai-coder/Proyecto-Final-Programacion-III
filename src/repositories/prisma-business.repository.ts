import { PrismaClient, Business } from '@prisma/client';
import { IBusinessRepository, CreateBusinessDTO, UpdateBusinessDTO } from '../interfaces/business.interface';

export class PrismaBusinessRepository implements IBusinessRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(skip: number, take: number): Promise<[any[], number]> {
    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        skip,
        take,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          appointments: {
            where: { review: { isNot: null } },
            select: {
              review: {
                select: { rating: true }
              }
            }
          }
        }
      }),
      this.prisma.business.count()
    ]);

    const formatted = businesses.map(b => {
      const reviews = b.appointments?.map((a: any) => a.review).filter(Boolean) || [];
      const count = reviews.length;
      const avg = count > 0 ? Number((reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / count).toFixed(1)) : null;
      return {
        ...b,
        rating: avg,
        reviewCount: count
      };
    });

    return [formatted, total];
  }

  async findById(id: number): Promise<any | null> {
    const b = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        appointments: {
          where: { review: { isNot: null } },
          select: {
            review: {
              select: { rating: true }
            }
          }
        }
      }
    });

    if (!b) return null;

    const reviews = b.appointments?.map((a: any) => a.review).filter(Boolean) || [];
    const count = reviews.length;
    const avg = count > 0 ? Number((reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / count).toFixed(1)) : null;

    return {
      ...b,
      rating: avg,
      reviewCount: count
    };
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
