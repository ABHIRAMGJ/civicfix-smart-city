import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import jwt from 'jsonwebtoken';
import { getOrCreateUser, getUserByUid } from '../db/users.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'civicfix-enterprise-jwt-secret-2026';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name: string;
  role: 'citizen' | 'officer' | 'admin';
  departmentId: number | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function signAppToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // First try app-signed JWT (used for email/password login, OTP login, or role switcher)
  try {
    const decodedJwt = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    if (decodedJwt && decodedJwt.uid) {
      const dbUser = await getUserByUid(decodedJwt.uid);
      req.user = dbUser
        ? {
            uid: dbUser.uid,
            email: dbUser.email,
            name: dbUser.name,
            role: (dbUser.role as 'citizen' | 'officer' | 'admin') || 'citizen',
            departmentId: dbUser.departmentId,
          }
        : decodedJwt;
      return next();
    }
  } catch {
    // Not a local JWT; proceed to verify as a Firebase ID Token
  }

  try {
    const decodedFirebase = await adminAuth.verifyIdToken(token);
    const dbUser = await getOrCreateUser(
      decodedFirebase.uid,
      decodedFirebase.email || `${decodedFirebase.uid}@civicfix.org`,
      decodedFirebase.name || decodedFirebase.email?.split('@')[0] || 'Citizen'
    );
    req.user = {
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: (dbUser.role as 'citizen' | 'officer' | 'admin') || 'citizen',
      departmentId: dbUser.departmentId,
    };
    return next();
  } catch (error) {
    console.error('Error verifying authentication token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedJwt = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    if (decodedJwt && decodedJwt.uid) {
      req.user = decodedJwt;
      return next();
    }
  } catch {
    // Try Firebase token
  }
  try {
    const decodedFirebase = await adminAuth.verifyIdToken(token);
    const dbUser = await getOrCreateUser(
      decodedFirebase.uid,
      decodedFirebase.email || `${decodedFirebase.uid}@civicfix.org`,
      decodedFirebase.name
    );
    req.user = {
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: (dbUser.role as 'citizen' | 'officer' | 'admin') || 'citizen',
      departmentId: dbUser.departmentId,
    };
  } catch {
    // Ignore invalid optional token
  }
  return next();
};

export const requireRole = (allowedRoles: Array<'citizen' | 'officer' | 'admin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' does not have permission for this resource`,
      });
    }
    next();
  };
};
