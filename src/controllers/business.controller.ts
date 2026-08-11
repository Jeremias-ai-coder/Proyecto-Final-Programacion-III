import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { createBusinessSchema } from '../validators/business.validator';

const prisma = new PrismaClient();

export class BusinessController {
  static async getBusinesses(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 200);
    const skip = (page - 1) * limit;

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        skip,
        take: limit,
        include: { owner: { select: { id: true, name: true, email: true } } }
      }),
      prisma.business.count()
    ]);

    res.json({
      data: businesses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  }

  static async getBusiness(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const business = await prisma.business.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true } } }
    });

    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }

    res.json(business);
  }

  static async createBusiness(req: Request, res: Response) {
    const parsed = createBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const userId = (req as any).user.id; // From authGuard
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    const business = await prisma.business.create({
      data: {
        ...parsed.data,
        ownerId: userId
      }
    });

    if (currentUser && currentUser.role === 'client') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'owner' }
      });
    }

    res.status(201).json(business);
  }

  static async getMyBusinesses(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const businesses = await prisma.business.findMany({
      where: { ownerId: userId },
    });
    res.json({ data: businesses, meta: { total: businesses.length } });
  }

  static async updateBusiness(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const userId = (req as any).user.id;

    const business = await prisma.business.findUnique({ where: { id } });
    if (!business) throw new AppError('Negocio no encontrado', 404);
    if (business.ownerId !== userId && (req as any).user.role !== 'administrator') {
      throw new AppError('No autorizado', 403);
    }

    const { name, description, address, phone, category } = req.body;
    const updated = await prisma.business.update({
      where: { id },
      data: { name, description, address, phone, category }
    });

    res.json(updated);
  }
}
