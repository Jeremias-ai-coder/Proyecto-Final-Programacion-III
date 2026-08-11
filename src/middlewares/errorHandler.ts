import express, { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: any[];

  constructor(message: string, statusCode: number, details?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Error interno del servidor';
  const errorName = err instanceof AppError && statusCode < 500 ? 'Bad Request' : 'Internal Server Error';
  
  const errorResponse = {
    statusCode,
    error: errorName,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    details: err instanceof AppError ? err.details || [] : []
  };

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json(errorResponse);
};
