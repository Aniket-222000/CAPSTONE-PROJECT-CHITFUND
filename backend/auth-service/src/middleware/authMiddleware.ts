// import { Request, Response, NextFunction } from 'express';
// import { verifyToken } from '../utils/jwtUtils';
// import { UserRole } from '../models/User';

// interface AuthRequest extends Request {
//     user?: { userId: string; role: UserRole };
// }

// export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) return res.status(403).json({ message: 'No token provided' });

//     try {
//         const decoded = verifyToken(token);
//         req.user = decoded as { userId: string; role: UserRole };
//         next();
//     } catch {
//         res.status(401).json({ message: 'Unauthorized' });
//     }
// };

// export const authorizeRole = (roles: UserRole[]) => {
//     return (req: AuthRequest, res: Response, next: NextFunction) => {
//         if (!req.user || !roles.includes(req.user.role)) {
//             return res.status(403).json({ message: 'Forbidden' });
//         }
//         next();
//     };
// };

// middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * Authenticate incoming requests by verifying the JWT token.
 * Attaches userId, userEmail, and userRole to req on success.
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
     res.status(401).json({ message: 'Authentication token missing' });
  }

  const token = authHeader?.split(' ')[1];
  try {
    if (!token) throw new Error('Token is undefined');
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.userId = payload.userId;
    req.userEmail = payload.userEmail;
    req.userRole = payload.userRole;
    next();
  } catch (err) {
     res.status(403).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Authorize only users with specific roles.
 * Usage: router.get('/admin', authenticateJWT, authorizeRoles(['admin']), handler);
 */
export const authorizeRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
       res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};
