import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';

export class AuthController {
  static async register(req: Request, res: Response) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const { name, email, password, role } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('El email ya está en uso', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        emailNotifications: user.emailNotifications,
        whatsappNotifications: user.whatsappNotifications,
        createdAt: null,
        deletedAt: user.deletedAt
      }
    });
  }

  static async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Credenciales incorrectas', 401);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Credenciales incorrectas', 401);
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        emailNotifications: user.emailNotifications,
        whatsappNotifications: user.whatsappNotifications,
        createdAt: null,
        deletedAt: user.deletedAt
      }
    });
  }

  static async getMe(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      emailNotifications: user.emailNotifications,
      whatsappNotifications: user.whatsappNotifications,
      createdAt: null,
      deletedAt: user.deletedAt
    });
  }

  static async updateProfile(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { name, phone, emailNotifications, whatsappNotifications } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (emailNotifications !== undefined) data.emailNotifications = emailNotifications;
    if (whatsappNotifications !== undefined) data.whatsappNotifications = whatsappNotifications;

    const user = await prisma.user.update({ where: { id: userId }, data });

    res.json({
      id: user.id, name: user.name, email: user.email, role: user.role,
      phone: user.phone, emailNotifications: user.emailNotifications,
      whatsappNotifications: user.whatsappNotifications,
    });
  }
}
