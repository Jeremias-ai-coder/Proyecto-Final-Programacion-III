import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { AppError } from '../middlewares/errorHandler';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const result = await this.authService.register(parsed.data);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      throw new AppError('Datos inválidos', 400, details);
    }

    const result = await this.authService.login(parsed.data);
    res.json(result);
  };

  getMe = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const user = await this.authService.getMe(userId);
    res.json(user);
  };

  updateProfile = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { name, phone, emailNotifications, whatsappNotifications } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (emailNotifications !== undefined) data.emailNotifications = emailNotifications;
    if (whatsappNotifications !== undefined) data.whatsappNotifications = whatsappNotifications;

    const user = await this.authService.updateProfile(userId, data);
    res.json(user);
  };
}
