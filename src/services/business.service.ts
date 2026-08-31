import { IBusinessRepository, CreateBusinessDTO, UpdateBusinessDTO } from '../interfaces/business.interface';
import { IUserRepository } from '../interfaces/user.interface';
import { AppError } from '../middlewares/errorHandler';
import { getPaginationOptions, createPaginatedResponse } from '../utils/pagination';

export class BusinessService {
  constructor(
    private businessRepo: IBusinessRepository,
    private userRepo: IUserRepository
  ) {}

  async getBusinesses(page: number = 1, limit: number = 10) {
    const pagination = getPaginationOptions(page, limit, 200);
    const [businesses, total] = await this.businessRepo.findAll(pagination.skip, pagination.limit);

    return createPaginatedResponse(businesses, total, pagination.page, pagination.limit);
  }

  async getBusinessById(id: number) {
    const business = await this.businessRepo.findById(id);
    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }
    return business;
  }

  async createBusiness(userId: number, data: CreateBusinessDTO) {
    const business = await this.businessRepo.create(userId, data);

    const currentUser = await this.userRepo.findById(userId);
    if (currentUser && currentUser.role === 'client') {
      await this.userRepo.update(userId, { role: 'owner' });
    }

    return business;
  }

  async getMyBusinesses(userId: number) {
    const businesses = await this.businessRepo.findByOwnerId(userId);
    return {
      data: businesses,
      meta: { total: businesses.length }
    };
  }

  async updateBusiness(id: number, userId: number, userRole: string, data: UpdateBusinessDTO) {
    const business = await this.businessRepo.findById(id);
    if (!business) {
      throw new AppError('Negocio no encontrado', 404);
    }

    if (business.ownerId !== userId && userRole !== 'administrator') {
      throw new AppError('No autorizado', 403);
    }

    return this.businessRepo.update(id, data);
  }
}
