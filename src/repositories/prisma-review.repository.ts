import { PrismaClient, Review } from '@prisma/client';
import { IReviewRepository, CreateReviewDTO } from '../interfaces/review.interface';

export class PrismaReviewRepository implements IReviewRepository {
  constructor(private prisma: PrismaClient) {}

  async create(appointmentId: number, data: CreateReviewDTO): Promise<Review> {
    return this.prisma.review.create({
      data: {
        appointmentId,
        rating: data.rating,
        comment: data.comment
      }
    });
  }

  async findByAppointmentId(appointmentId: number): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { appointmentId }
    });
  }

  async findByBusinessId(businessId: number, skip: number, take: number): Promise<[any[], number]> {
    return Promise.all([
      this.prisma.review.findMany({
        where: {
          appointment: {
            businessId
          }
        },
        include: {
          appointment: {
            include: {
              user: { select: { id: true, name: true } },
              service: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      this.prisma.review.count({
        where: {
          appointment: {
            businessId
          }
        }
      })
    ]);
  }

  async getAverageRating(businessId: number): Promise<{ average: number; count: number }> {
    const aggregations = await this.prisma.review.aggregate({
      where: {
        appointment: {
          businessId
        }
      },
      _avg: {
        rating: true
      },
      _count: {
        id: true
      }
    });

    return {
      average: aggregations._avg.rating ? Number(aggregations._avg.rating.toFixed(1)) : 0,
      count: aggregations._count.id
    };
  }
}
