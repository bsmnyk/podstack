import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from './jwt';
import { storage } from './storage';

// Middleware to verify JWT token
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify token
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // Get user from database
    const user = await storage.getUser(payload.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Add user to request object
    (req as any).user = user;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
}
