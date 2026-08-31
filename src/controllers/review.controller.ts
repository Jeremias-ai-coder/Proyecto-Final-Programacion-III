import { Request, Response } from 'express';
import { ReviewService } from '../services/review.service';
import { createReviewSchema } from '../validators/review.validator';
import { AppError } from '../middlewares/errorHandler';

export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  createReview = async (req: Request, res: Response) => {
    const appointmentId = parseInt(req.params.id);
    const userId = (req as any).user.id;

    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos de reseña inválidos', 400, details);
    }

    const review = await this.reviewService.createReview(userId, appointmentId, parsed.data);
    res.status(201).json(review);
  };

  getBusinessReviews = async (req: Request, res: Response) => {
    const businessId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.reviewService.getBusinessReviews(businessId, page, limit);
    res.json(result);
  };
}
