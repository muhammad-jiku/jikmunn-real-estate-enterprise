/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createClerkClient, verifyToken } from '@clerk/express';
import { NextFunction, Request, Response } from 'express';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware using Clerk
 * Verifies JWT token and checks role-based access
 */
export const auth = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify the token with Clerk
      const verifiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      const userId = verifiedToken.sub;

      if (!userId) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }

      // Get user details to check role from unsafeMetadata (client-writable)
      const user = await clerkClient.users.getUser(userId);
      const userRole = (user.unsafeMetadata?.role as string) || 'tenant';

      req.user = {
        id: userId,
        role: userRole,
      };

      // Store authentication status in res.locals for response sanitization
      res.locals.isAuthenticated = true;

      const hasAccess = allowedRoles.includes(userRole.toLowerCase());

      if (!hasAccess) {
        res.status(403).json({ message: 'Access Denied' });
        return;
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ message: 'Authentication failed' });
      return;
    }
  };
};

/**
 * Optional authentication middleware
 * Sets req.user and res.locals.isAuthenticated if a valid token is present,
 * but doesn't fail if no token or invalid token is provided.
 * Useful for public endpoints that want to provide more data to authenticated users.
 */
export const optionalAuth = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided - continue as unauthenticated
      res.locals.isAuthenticated = false;
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify the token with Clerk
      const verifiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      const userId = verifiedToken.sub;

      if (userId) {
        // Get user details
        const user = await clerkClient.users.getUser(userId);
        const userRole = (user.unsafeMetadata?.role as string) || 'tenant';

        req.user = {
          id: userId,
          role: userRole,
        };

        res.locals.isAuthenticated = true;
      } else {
        res.locals.isAuthenticated = false;
      }
    } catch {
      // Token verification failed - continue as unauthenticated
      res.locals.isAuthenticated = false;
    }

    next();
  };
};
