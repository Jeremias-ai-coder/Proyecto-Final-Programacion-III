import { PrismaClient, User, Role } from '@prisma/client';
import { IUserRepository, CreateUserDTO, UpdateUserDTO } from '../interfaces/user.interface';

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async create(data: CreateUserDTO): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role || 'client',
        phone: data.phone
      }
    });
  }

  async update(id: number, data: UpdateUserDTO): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  async delete(id: number): Promise<User> {
    return this.prisma.user.delete({
      where: { id }
    });
  }

  async findAll(): Promise<Array<Pick<User, 'id' | 'name' | 'email' | 'role' | 'phone'>>> {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, phone: true }
    });
  }

  async count(role?: Role): Promise<number> {
    if (role) {
      return this.prisma.user.count({ where: { role } });
    }
    return this.prisma.user.count();
  }
}
