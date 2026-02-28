import { Response } from 'express';
import { config } from '../config/index.config';

/**
 * Standardized API Response Utility
 *
 * This module provides utilities for creating consistent, secure API responses.
 * In production, sensitive fields are automatically stripped from responses.
 */

// ============================================================================
// TYPES
// ============================================================================

interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

// ============================================================================
// SENSITIVE FIELDS CONFIGURATION
// ============================================================================

/**
 * Fields that should be stripped from API responses in production.
 * Add any field names here that should never be exposed to the client.
 */
const SENSITIVE_FIELDS = new Set([
  // Internal database fields
  'deletedAt',
  'internalNotes',
  'passwordHash',
  'passwordResetToken',
  'passwordResetExpires',
  'refreshToken',
  'verificationToken',

  // Audit fields (optional - can be kept if needed)
  // 'createdAt',
  // 'updatedAt',
]);

/**
 * Fields to strip from nested user/author objects in public responses.
 * These are fields that should not be exposed when embedding user data.
 */
const SENSITIVE_USER_FIELDS = new Set([
  'email',
  'phoneNumber',
  'cognitoId',
  'passwordHash',
  'refreshToken',
]);

/**
 * Internal ID fields that should be hidden in production.
 * Foreign keys and references that leak internal structure.
 */
const INTERNAL_ID_FIELDS = new Set([
  'tenantCognitoId',
  'managerCognitoId',
  'authorId',
  'locationId',
]);

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Recursively sanitizes an object by removing sensitive fields.
 * Works with nested objects and arrays.
 */
export function sanitizeObject<T>(
  obj: T,
  options: {
    removeSensitive?: boolean;
    removeInternalIds?: boolean;
    sanitizeUserFields?: boolean;
    allowedFields?: string[];
    excludeFields?: string[];
  } = {}
): T {
  const {
    removeSensitive = true,
    removeInternalIds = true,
    sanitizeUserFields = false,
    allowedFields,
    excludeFields = [],
  } = options;

  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options)) as T;
  }

  // Handle non-objects
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  const excludeSet = new Set(excludeFields);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    // Skip explicitly excluded fields
    if (excludeSet.has(key)) {
      continue;
    }

    // If allowedFields is specified, only include those fields
    if (allowedFields && !allowedFields.includes(key)) {
      continue;
    }

    // Skip sensitive fields in production
    if (removeSensitive && SENSITIVE_FIELDS.has(key)) {
      continue;
    }

    // Skip internal ID fields in production
    if (removeInternalIds && INTERNAL_ID_FIELDS.has(key)) {
      continue;
    }

    // Recursively sanitize nested objects
    if (value !== null && typeof value === 'object') {
      // Check if this is a user/manager/tenant object that needs additional sanitization
      const isUserObject = ['manager', 'tenant', 'author', 'user'].includes(key);

      result[key] = sanitizeObject(value, {
        ...options,
        sanitizeUserFields: sanitizeUserFields || isUserObject,
        removeSensitive: removeSensitive || isUserObject,
      });
    } else {
      // Skip sensitive user fields when sanitizing user objects
      if (sanitizeUserFields && SENSITIVE_USER_FIELDS.has(key)) {
        continue;
      }
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Check if the application is running in production mode.
 */
export function isProduction(): boolean {
  return config.env === 'production';
}

/**
 * Sanitize data based on environment and authentication status.
 * - In development: returns data as-is for debugging
 * - In production when authenticated: returns data as-is (user can see their own data)
 * - In production when NOT authenticated: strips sensitive fields
 */
export function sanitizeForResponse<T>(
  data: T,
  options: {
    alwaysSanitize?: boolean;
    removeInternalIds?: boolean;
    sanitizeUserFields?: boolean;
    excludeFields?: string[];
    isAuthenticated?: boolean;
  } = {}
): T {
  const { alwaysSanitize = false, isAuthenticated = false, ...sanitizeOptions } = options;

  // In development, skip sanitization for easier debugging
  if (!isProduction()) {
    return data;
  }

  // In production, skip sanitization for authenticated users
  // They should be able to see contact info and IDs needed for messaging
  if (isAuthenticated && !alwaysSanitize) {
    return data;
  }

  // If alwaysSanitize is false and not in production, return as-is
  if (!alwaysSanitize && !isProduction()) {
    return data;
  }

  return sanitizeObject(data, {
    removeSensitive: true,
    removeInternalIds: true,
    ...sanitizeOptions,
  });
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Send a standardized success response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  options: {
    sanitize?: boolean;
    excludeFields?: string[];
    isAuthenticated?: boolean;
  } = {}
): void {
  const { sanitize = true, excludeFields } = options;

  // Auto-detect authentication from res.locals (set by auth middleware)
  // Can be overridden by explicitly passing isAuthenticated option
  const isAuthenticated = options.isAuthenticated ?? res.locals?.isAuthenticated ?? false;

  const sanitizedData = sanitize
    ? sanitizeForResponse(data, { excludeFields, isAuthenticated })
    : data;

  res.status(statusCode).json({
    success: true,
    message,
    data: sanitizedData,
  });
}

/**
 * Send a standardized success response with pagination metadata.
 */
export function sendPaginatedSuccess<T>(
  res: Response,
  data: T[],
  pagination: PaginationOptions,
  message: string = 'Success',
  options: {
    sanitize?: boolean;
    excludeFields?: string[];
    isAuthenticated?: boolean;
  } = {}
): void {
  const { sanitize = true, excludeFields } = options;

  // Auto-detect authentication from res.locals (set by auth middleware)
  const isAuthenticated = options.isAuthenticated ?? res.locals?.isAuthenticated ?? false;

  const sanitizedData = sanitize
    ? sanitizeForResponse(data, { excludeFields, isAuthenticated })
    : data;

  res.status(200).json({
    success: true,
    message,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
    data: sanitizedData,
  });
}

/**
 * Send a standardized error response.
 * Error details are hidden in production.
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: Error | string
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response: Record<string, any> = {
    success: false,
    message,
  };

  // Include error details only in development
  if (!isProduction() && error) {
    response.error = error instanceof Error ? error.message : error;
    if (error instanceof Error && error.stack) {
      response.stack = error.stack;
    }
  }

  res.status(statusCode).json(response);
}

/**
 * Send a 404 Not Found response.
 */
export function sendNotFound(res: Response, resource: string = 'Resource'): void {
  sendError(res, `${resource} not found`, 404);
}

/**
 * Send a 400 Bad Request response.
 */
export function sendBadRequest(res: Response, message: string = 'Bad request'): void {
  sendError(res, message, 400);
}

/**
 * Send a 401 Unauthorized response.
 */
export function sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
  sendError(res, message, 401);
}

/**
 * Send a 403 Forbidden response.
 */
export function sendForbidden(res: Response, message: string = 'Forbidden'): void {
  sendError(res, message, 403);
}

/**
 * Send a 409 Conflict response (e.g., duplicate resource).
 */
export function sendConflict(res: Response, message: string = 'Resource already exists'): void {
  sendError(res, message, 409);
}

// ============================================================================
// NULL/EMPTY VALUE HANDLING
// ============================================================================

/**
 * Remove null and empty values from an object.
 * Useful for cleaning up optional fields that weren't populated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stripEmptyValues<T extends Record<string, any>>(
  obj: T,
  options: {
    removeNull?: boolean;
    removeEmptyStrings?: boolean;
    removeEmptyArrays?: boolean;
  } = {}
): Partial<T> {
  const { removeNull = true, removeEmptyStrings = true, removeEmptyArrays = true } = options;

  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip null values
    if (removeNull && value === null) continue;

    // Skip empty strings
    if (removeEmptyStrings && value === '') continue;

    // Skip empty arrays
    if (removeEmptyArrays && Array.isArray(value) && value.length === 0) continue;

    // Recursively process nested objects (but not arrays or dates)
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      const cleaned = stripEmptyValues(value, options);
      if (Object.keys(cleaned).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)[key] = cleaned;
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = value;
    }
  }

  return result;
}

/**
 * Combine sanitization and empty value stripping.
 * This is the recommended function for production responses.
 */
export function prepareResponse<T>(
  data: T,
  options: {
    sanitize?: boolean;
    stripEmpty?: boolean;
    excludeFields?: string[];
  } = {}
): T {
  const { sanitize = true, stripEmpty = true, excludeFields } = options;

  let result = data;

  if (sanitize) {
    result = sanitizeForResponse(result, { excludeFields });
  }

  if (stripEmpty && result !== null && typeof result === 'object') {
    if (Array.isArray(result)) {
      result = result.map((item) =>
        typeof item === 'object' && item !== null ? stripEmptyValues(item) : item
      ) as T;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = stripEmptyValues(result as Record<string, any>) as T;
    }
  }

  return result;
}
