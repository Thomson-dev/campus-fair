import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface JwtPayload {
  id: string;
  role: string;
}

/**
 * Verifies the Bearer JWT. Attaches req.user on success.
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env['JWT_SECRET'] as string) as JwtPayload;
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or deactivated' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    const message = (err as Error).name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ success: false, message });
  }
};

/**
 * Restrict access to specific roles. Must follow `protect`.
 */
export const restrictTo = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user?.role ?? '')) {
      res.status(403).json({ success: false, message: 'You do not have permission for this action' });
      return;
    }
    next();
  };
