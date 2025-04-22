import jwt from 'jsonwebtoken';
import { User } from '@shared/schema';

// JWT secret key - in a real app, this would be in an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'newsletter-hub-jwt-secret';
const JWT_EXPIRES_IN = '7d'; // JWT token expires in 7 days

// Interface for token payload
export interface TokenPayload {
  userId: number;
  email: string;
  username: string;
}

// Generate a JWT token for a user
export function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    username: user.username
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify a JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

// Extract token from Authorization header
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

// Authentication middleware for Express
export function authMiddleware(req: any, res: any, next: any) {
  // Check for token in Authorization header
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Verify token
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  
  // Add user info to request object
  req.user = payload;
  
  // Continue to the next middleware or route handler
  next();
}
