import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface DecodedToken extends JwtPayload {
  sub: string;
  'custom:role'?: string;
}

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

export const authMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('token:', token);

    if (!token) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const decoded = jwt.decode(token) as DecodedToken;
      const userRole = decoded['custom:role'] || '';
      console.log('decoded token:', decoded);
      console.log('user role:', userRole);

      req.user = {
        id: decoded.sub,
        role: userRole,
      };
      console.log('req.user:', req.user);

      const hasAccess = allowedRoles.includes(userRole.toLowerCase());
      console.log('hasAccess:', hasAccess);

      if (!hasAccess) {
        res.status(403).json({ message: 'Access Denied' });
        return;
      }
    } catch (err) {
      console.log('Failed to decode token:', err);
      res.status(400).json({ message: 'Invalid token' });
      return;
    }

    next();
  };
};
