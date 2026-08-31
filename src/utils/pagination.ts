export interface PaginationParams {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Normaliza y calcula los parámetros de paginación para consultas de base de datos.
 */
export function getPaginationOptions(
  page: number = 1,
  limit: number = 10,
  maxLimit: number = 100
): PaginationOptions {
  const safePage = Math.max(1, page || 1);
  const safeLimit = Math.min(Math.max(1, limit || 10), maxLimit);
  const skip = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip
  };
}

/**
 * Genera el formato de respuesta paginada estándar con metadata.
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
}
