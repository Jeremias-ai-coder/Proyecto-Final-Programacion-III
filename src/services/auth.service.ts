import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IUserRepository, CreateUserDTO, UpdateUserDTO } from '../interfaces/user.interface';
import { AppError } from '../middlewares/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';

export class AuthService {
  constructor(private userRepo: IUserRepository) {}

  async register(data: { name: string; email: string; password: string }) {
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('El email ya está en uso', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.userRepo.create({
      name: data.name,
      email: data.email,
      password: hashedPassword
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    return {
      token,
      user: this.sanitizeUser(user)
    };
  }

  async login(data: { email: string; password: string }) {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      throw new AppError('Credenciales incorrectas', 401);
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new AppError('Credenciales incorrectas', 401);
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    return {
      token,
      user: this.sanitizeUser(user)
    };
  }

  async getMe(userId: number) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: number, data: UpdateUserDTO) {
    const updated = await this.userRepo.update(userId, data);
    return this.sanitizeUser(updated);
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      emailNotifications: user.emailNotifications,
      whatsappNotifications: user.whatsappNotifications,
      createdAt: user.createdAt || null,
      deletedAt: user.deletedAt || null
    };
  }
}
