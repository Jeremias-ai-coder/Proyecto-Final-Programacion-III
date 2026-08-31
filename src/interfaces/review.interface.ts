import { Review } from '@prisma/client';

export interface CreateReviewDTO {
  rating: number;
  comment?: string | null;
}

export interface IReviewRepository {
  create(appointmentId: number, data: CreateReviewDTO): Promise<Review>;
  findByAppointmentId(appointmentId: number): Promise<Review | null>;
  findByBusinessId(businessId: number, skip: number, take: number): Promise<[any[], number]>;
  getAverageRating(businessId: number): Promise<{ average: number; count: number }>;
}
