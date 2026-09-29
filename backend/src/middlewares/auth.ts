import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../constants/enums';
import User from '../models/User';
import CustomerProfile from '../models/CustomerProfile';
import { auth as firebaseAuth } from '../config/firebaseAdmin';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
    authProviderId?: string;
  };
  authProviderUid?: string;
  file?: Express.Multer.File;
}

/**
 * Authentication Middleware: Managed Provider (Firebase Auth) Token Verification.
 * 
 * Verifies the incoming Bearer ID Token using Firebase Admin SDK.
 * Resolves or auto-provisions the corresponding application user in MongoDB
 * and attaches the verified identity to req.user.
 */
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Please login or create an account before booking.' });
    }

    let uid: string = '';
    let email: string = '';
    let roleFromToken: UserRole | undefined;

    // 1. Primary: Verify with Firebase Admin SDK
    try {
      const decodedFirebaseToken = await firebaseAuth.verifyIdToken(token);
      uid = decodedFirebaseToken.uid;
      email = (decodedFirebaseToken.email || '').toLowerCase();
      roleFromToken = decodedFirebaseToken.role as UserRole;
    } catch (firebaseErr: any) {
      // 2. Fallback: Check local JWT for backwards compatibility during migration or tests
      try {
        const decodedJwt = jwt.verify(token, env.JWT_SECRET) as { id: string; role: UserRole; email: string };
        const userByJwt = await User.findById(decodedJwt.id);
        if (userByJwt) {
          if (!userByJwt.isActive) {
            return res.status(401).json({ success: false, message: 'Account is deactivated.' });
          }
          if (userByJwt.isBlocked) {
            return res.status(403).json({
              success: false,
              isBlocked: true,
              message: `Your account has been blocked by an administrator. Reason: ${userByJwt.blockedReason || 'Policy or terms violation'}. Please contact support.`,
            });
          }
          req.user = {
            id: userByJwt._id.toString(),
            role: userByJwt.role,
            email: userByJwt.email,
            authProviderId: userByJwt.authProviderId,
          };
          return next();
        }
      } catch {
        // Both verification paths failed
        return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
      }

      return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
    }

    // 3. Resolve user in our database (by Firebase UID or email)
    let user = await User.findOne({ authProviderId: uid });

    if (!user && email) {
      // Check if user already exists from email before managed auth migration
      user = await User.findOne({ email });
      if (user) {
        // Seamlessly link existing account with Firebase UID
        user.authProviderId = uid;
        await user.save();
      }
    }

    // 4. Auto-provision new user on first sign-in (e.g. Social Google/GitHub signup)
    if (!user && email) {
      user = await User.create({
        authProviderId: uid,
        email,
        role: roleFromToken || UserRole.CUSTOMER,
        plan: 'standard',
        preferences: {
          notifications: { email: true, sms: true },
          language: 'en',
          theme: 'light',
        },
        isActive: true,
        isBlocked: false,
      });

      // Create default customer profile
      await CustomerProfile.create({
        userId: user._id,
        fullName: email.split('@')[0],
        gender: 'OTHER',
        addresses: [],
      });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account not found or deactivated.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: `Your account has been blocked by an administrator. Reason: ${user.blockedReason || 'Policy or terms violation'}. Please contact support.`,
      });
    }

    req.authProviderUid = uid;
    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      authProviderId: user.authProviderId,
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized for this resource.`,
      });
    }

    next();
  };
};
