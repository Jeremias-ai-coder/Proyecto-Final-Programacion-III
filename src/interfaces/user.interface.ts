import { User, Role } from '@prisma/client';

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role?: Role;
  phone?: string;
}

export interface UpdateUserDTO {
  name?: string;
  phone?: string;
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  role?: Role;
}

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDTO): Promise<User>;
  update(id: number, data: UpdateUserDTO): Promise<User>;
  delete(id: number): Promise<User>;
  findAll(): Promise<Array<Pick<User, 'id' | 'name' | 'email' | 'role' | 'phone'>>>;
  count(role?: Role): Promise<number>;
}
