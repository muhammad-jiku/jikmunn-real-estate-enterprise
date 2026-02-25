import { NextFunction, Request, Response } from 'express';
import { config } from '../../config/index.config';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  errors: Record<string, string[]>;

  constructor(message: string = 'Validation Error', errors: Record<string, string[]> = {}) {
    super(message, 422);
    this.errors = errors;
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500);
  }
}

// Global error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    const response: Record<string, unknown> = {
      success: false,
      message: err.message,
      statusCode: err.statusCode,
    };

    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code?: string; meta?: { target?: string[] } };

    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: `Duplicate entry for ${prismaError.meta?.target?.join(', ') || 'field'}`,
        statusCode: 409,
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Record not found',
        statusCode: 404,
      });
      return;
    }
  }

  // Default error
  res.status(500).json({
    success: false,
    message: config.env === 'production' ? 'Internal Server Error' : err.message,
    statusCode: 500,
  });
};

// Async handler wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
