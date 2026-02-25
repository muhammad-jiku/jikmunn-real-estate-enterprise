import { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../config/index.config';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per hour
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment endpoint limiter
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 payment requests per minute
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  message: {
    success: false,
    message: 'Too many uploads, please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Skip rate limiting for certain IPs (e.g., internal services)
export const skipRateLimitForTrustedIPs = (req: Request): boolean => {
  return config.rateLimit.trustedIPs.includes(req.ip || '');
};
