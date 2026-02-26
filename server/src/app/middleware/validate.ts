import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import logger from '../../lib/logger';
import { ValidationError } from './errorHandler';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info('[Validate] Request body:', JSON.stringify(req.body, null, 2));
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.info('[Validate] Zod errors:', JSON.stringify(error.issues, null, 2));
        const errors: Record<string, string[]> = {};

        error.issues.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        next(new ValidationError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};
