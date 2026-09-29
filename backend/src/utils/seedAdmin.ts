import { env } from '../config/env';
import User from '../models/User';
import { UserRole, VerificationStatus } from '../constants/enums';
import { hashPassword, verifyPassword } from './passwordSecurity';

export const seedDefaultAdmin = async () => {
  try {
    const adminEmail = (env.DEFAULT_ADMIN_EMAIL || 'admin@healthcare.com').toLowerCase().trim();
    const adminPassword = env.DEFAULT_ADMIN_PASSWORD ? env.DEFAULT_ADMIN_PASSWORD.trim() : '';

    if (!adminPassword) {
      console.warn('[Admin Seed] Notice: DEFAULT_ADMIN_PASSWORD environment variable is missing or empty. Skipping admin account seeding safely.');
      return;
    }

    if (adminPassword.length < 6) {
      console.error('[Admin Seed] ERROR: Configured DEFAULT_ADMIN_PASSWORD does not satisfy security requirements (minimum 6 characters required). Skipping admin account seeding.');
      return;
    }

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const passwordHash = await hashPassword(adminPassword);
      admin = await User.create({
        email: adminEmail,
        passwordHash,
        phone: '9999999999',
        role: UserRole.ADMIN,
        verificationStatus: VerificationStatus.NOT_REQUIRED,
        isGuest: false,
        isActive: true,
      });
      console.log(`[Admin Seed] Admin user created successfully (${adminEmail})`);
    } else {
      const { isValid } = await verifyPassword(adminPassword, admin.passwordHash || '');
      if (!isValid) {
        admin.passwordHash = await hashPassword(adminPassword);
        admin.isActive = true;
        await admin.save();
        console.log(`[Admin Seed] Admin password updated successfully to match DEFAULT_ADMIN_PASSWORD (${adminEmail})`);
      } else {
        console.log(`[Admin Seed] Admin user already present and verified in database (${adminEmail})`);
      }
    }
  } catch (error) {
    console.error('[Admin Seed] Error seeding admin user:', error);
  }
};
