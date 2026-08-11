import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { createServiceSchema } from '../validators/service.validator';

const prisma = new PrismaClient();

export class ServiceController {
  static async getServices(req: Request, res: Response) {
    const businessId = parseInt(req.params.id);

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }

    const services = await prisma.service.findMany({
      where: { businessId }
    });

    res.json(services); // Service lists don't always need pagination, or we return them simply here
  }

  static async createService(req: Request, res: Response) {
    const businessId = parseInt(req.params.id);
    const userId = (req as any).user.id;

    // Check if business exists and user is owner
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }
    
    if (business.ownerId !== userId) {
      throw new AppError('No tienes permiso para agregar servicios a este negocio', 403);
    }

    const parsed = createServiceSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const service = await prisma.service.create({
      data: {
        ...parsed.data,
        businessId
      }
    });

    res.status(201).json(service);
  }

  static async deleteService(req: Request, res: Response) {
    const businessId = parseInt(req.params.id);
    const serviceId = parseInt(req.params.serviceId);
    const userId = (req as any).user.id;

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new AppError('Negocio no encontrado', 404);
    if (business.ownerId !== userId && (req as any).user.role !== 'administrator') {
      throw new AppError('No autorizado', 403);
    }

    await prisma.service.delete({ where: { id: serviceId } });
    res.json({ message: 'Servicio eliminado correctamente' });
  }
}
