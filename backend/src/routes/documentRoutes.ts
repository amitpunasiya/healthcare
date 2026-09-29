import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { authenticateToken, AuthRequest } from '../middlewares/auth';
import { uploadMulter, uploadDocument, viewDocument } from '../controllers/documentController';

const router = Router();

const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    req.user = decoded;
  } catch (_) {}
  next();
};

// Upload document (Supports both pre-registration and authenticated user uploads)
router.post('/upload', optionalAuth, uploadMulter.single('document'), uploadDocument);

// View secure document (Authenticated with IDOR check)
router.get('/view/:docId', authenticateToken, viewDocument);

export default router;
