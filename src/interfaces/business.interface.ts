import { Business } from '@prisma/client';

export interface CreateBusinessDTO {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  category?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  webhookUrl?: string;
}

export interface UpdateBusinessDTO {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  category?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  webhookUrl?: string;
}

export interface IBusinessRepository {
  findAll(skip: number, take: number): Promise<[any[], number]>;
  findById(id: number): Promise<any | null>;
  findByOwnerId(ownerId: number): Promise<Business[]>;
  create(ownerId: number, data: CreateBusinessDTO): Promise<Business>;
  update(id: number, data: UpdateBusinessDTO): Promise<Business>;
  count(): Promise<number>;
}
