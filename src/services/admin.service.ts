import { IUserRepository } from '../interfaces/user.interface';
import { IBusinessRepository } from '../interfaces/business.interface';
import { IAppointmentRepository } from '../interfaces/appointment.interface';
import { AppError } from '../middlewares/errorHandler';
import { Role } from '@prisma/client';

export class AdminService {
  constructor(
    private userRepo: IUserRepository,
    private businessRepo: IBusinessRepository,
    private appointmentRepo: IAppointmentRepository
  ) {}

  async getAllUsers() {
    const users = await this.userRepo.findAll();
    return { data: users, meta: { total: users.length } };
  }

  async updateUserRole(id: number, role: string) {
    if (!['client', 'owner', 'administrator'].includes(role)) {
      throw new AppError('Rol inválido', 400);
    }
    const user = await this.userRepo.update(id, { role: role as Role });
    return { id: user.id, name: user.name, role: user.role };
  }

  async deleteUser(id: number) {
    await this.userRepo.delete(id);
    return { message: 'Usuario eliminado correctamente' };
  }

  async getStats() {
    const [totalUsers, totalBusinesses, totalAppointments, totalAdmins] = await Promise.all([
      this.userRepo.count(),
      this.businessRepo.count(),
      this.appointmentRepo.count(),
      this.userRepo.count('administrator')
    ]);

    return { totalUsers, totalBusinesses, totalAppointments, totalAdmins };
  }

  async getAllAppointments() {
    const appointments = await this.appointmentRepo.findAll(100);
    return { data: appointments, meta: { total: appointments.length } };
  }
}
