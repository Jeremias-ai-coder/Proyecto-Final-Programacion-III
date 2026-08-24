import { Request, Response } from 'express';
import { BusinessService } from '../services/business.service';
import { createBusinessSchema } from '../validators/business.validator';
import { AppError } from '../middlewares/errorHandler';

export class BusinessController {
  constructor(private businessService: BusinessService) {}

  getBusinesses = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.businessService.getBusinesses(page, limit);
    res.json(result);
  };

  getBusiness = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const business = await this.businessService.getBusinessById(id);
    res.json(business);
  };

  createBusiness = async (req: Request, res: Response) => {
    const parsed = createBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const userId = (req as any).user.id;
    const business = await this.businessService.createBusiness(userId, parsed.data);
    res.status(201).json(business);
  };

  getMyBusinesses = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const result = await this.businessService.getMyBusinesses(userId);
    res.json(result);
  };

  updateBusiness = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const updated = await this.businessService.updateBusiness(id, userId, userRole, req.body);
    res.json(updated);
  };
}
