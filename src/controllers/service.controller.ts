import { Request, Response } from 'express';
import { ServiceService } from '../services/service.service';
import { createServiceSchema, updateServiceSchema } from '../validators/service.validator';
import { AppError } from '../middlewares/errorHandler';

export class ServiceController {
  constructor(private serviceService: ServiceService) {}

  getServices = async (req: Request, res: Response) => {
    const businessId = parseInt(req.params.id);
    const services = await this.serviceService.getServices(businessId);
    res.json(services);
  };

  createService = async (req: Request, res: Response) => {
    const businessId = parseInt(req.params.id);
    const userId = (req as any).user.id;

    const parsed = createServiceSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const service = await this.serviceService.createService(businessId, userId, parsed.data);
    res.status(201).json(service);
  };

  updateService = async (req: Request, res: Response) => {
    const businessId = parseInt(req.params.id);
    const serviceId = parseInt(req.params.serviceId);
    const user = (req as any).user;

    const parsed = updateServiceSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const service = await this.serviceService.updateService(businessId, serviceId, user, parsed.data);
    res.json(service);
  };

  deleteService = async (req: Request, res: Response) => {
    const businessId = parseInt(req.params.id);
    const serviceId = parseInt(req.params.serviceId);
    const user = (req as any).user;

    const result = await this.serviceService.deleteService(businessId, serviceId, user);
    res.json(result);
  };
}
