import { Router, Request, Response } from 'express';
import User from '../models/User';
import CustomerProfile from '../models/CustomerProfile';
import { UserRole } from '../constants/enums';
import { auth as firebaseAuth } from '../config/firebaseAdmin';

const router = Router();

/**
 * Webhook / Event Synchronization Endpoint for Managed Identity Provider (Firebase/Clerk/Supabase).
 * Handles user lifecycle events: creation, update, and deletion.
 */
router.post('/auth-events', async (req: Request, res: Response) => {
  try {
    const { eventType, user: eventUser } = req.body;

    if (!eventType || !eventUser) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload structure' });
    }

    const uid = eventUser.uid || eventUser.id;
    const email = (eventUser.email || '').toLowerCase().trim();

    switch (eventType) {
      case 'user.created': {
        let user = await User.findOne({ authProviderId: uid });
        if (!user && email) {
          user = await User.findOne({ email });
        }

        if (!user) {
          user = await User.create({
            authProviderId: uid,
            email,
            phone: eventUser.phone || '',
            role: eventUser.role || UserRole.CUSTOMER,
            plan: 'standard',
            preferences: {
              notifications: { email: true, sms: true },
              language: 'en',
              theme: 'light',
            },
            isActive: true,
          });

          await CustomerProfile.create({
            userId: user._id,
            fullName: eventUser.displayName || email.split('@')[0],
            gender: 'OTHER',
            addresses: [],
          });
          console.log(`[AUTH WEBHOOK] User created: ${email} (UID: ${uid})`);
        }
        break;
      }

      case 'user.deleted': {
        const deletedUser = await User.findOneAndUpdate(
          { authProviderId: uid },
          { isActive: false },
          { new: true }
        );
        console.log(`[AUTH WEBHOOK] User deactivated on provider deletion: UID ${uid} (${deletedUser?.email})`);
        break;
      }

      default:
        console.log(`[AUTH WEBHOOK] Received unhandled event: ${eventType}`);
    }

    return res.json({ success: true, received: true });
  } catch (error: any) {
    console.error('[AUTH WEBHOOK ERROR]:', error?.message);
    return res.status(500).json({ success: false, message: 'Webhook event processing failed' });
  }
});

/**
 * Synchronize current Firebase user session with MongoDB database.
 * Called by frontend client upon successful sign-in or social login.
 */
router.post('/sync-session', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = await firebaseAuth.verifyIdToken(token);
    const { uid, email } = decoded;
    const { fullName, phone, role } = req.body;

    let user = await User.findOne({ authProviderId: uid });
    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      user = await User.create({
        authProviderId: uid,
        email: (email || '').toLowerCase(),
        phone: phone || '',
        role: role || UserRole.CUSTOMER,
        plan: 'standard',
        preferences: {
          notifications: { email: true, sms: true },
          language: 'en',
          theme: 'light',
        },
        isActive: true,
      });

      await CustomerProfile.create({
        userId: user._id,
        fullName: fullName || (email ? email.split('@')[0] : 'User'),
        gender: 'OTHER',
        addresses: [],
      });
    } else {
      user.authProviderId = uid;
      if (phone && !user.phone) user.phone = phone;
      await user.save();
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: `Your account has been blocked by an administrator. Reason: ${user.blockedReason || 'Policy or terms violation'}. Please contact support.`,
      });
    }

    const customerProfile = await CustomerProfile.findOne({ userId: user._id });

    return res.json({
      success: true,
      message: 'User session synchronized successfully',
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        plan: user.plan,
        preferences: user.preferences,
        fullName: customerProfile?.fullName || user.email.split('@')[0],
      },
    });
  } catch (error: any) {
    console.error('[SYNC SESSION ERROR]:', error?.message);
    return res.status(401).json({ success: false, message: 'Failed to verify provider session' });
  }
});

export default router;
