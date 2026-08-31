import { IReviewRepository, CreateReviewDTO } from '../interfaces/review.interface';
import { IAppointmentRepository } from '../interfaces/appointment.interface';
import { AppError } from '../middlewares/errorHandler';
import { getPaginationOptions, createPaginatedResponse } from '../utils/pagination';

export class ReviewService {
  constructor(
    private reviewRepo: IReviewRepository,
    private appointmentRepo: IAppointmentRepository
  ) {}

  async createReview(userId: number, appointmentId: number, data: CreateReviewDTO) {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Turno no encontrado', 404);
    }

    if (appointment.userId !== userId) {
      throw new AppError('No tienes permiso para calificar un turno de otro usuario', 403);
    }

    if (appointment.status !== 'COMPLETED') {
      throw new AppError('Solo se pueden calificar turnos que hayan sido completados por el comercio', 400);
    }

    const existingReview = await this.reviewRepo.findByAppointmentId(appointmentId);
    if (existingReview) {
      throw new AppError('Este turno ya ha sido calificado previamente', 400);
    }

    return this.reviewRepo.create(appointmentId, data);
  }

  async getBusinessReviews(businessId: number, page: number = 1, limit: number = 10) {
    const pagination = getPaginationOptions(page, limit, 50);
    const [reviews, total] = await this.reviewRepo.findByBusinessId(
      businessId,
      pagination.skip,
      pagination.limit
    );
    const ratingStats = await this.reviewRepo.getAverageRating(businessId);

    const response = createPaginatedResponse(reviews, total, pagination.page, pagination.limit);
    return {
      ...response,
      stats: ratingStats
    };
  }
}
