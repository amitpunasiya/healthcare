import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import ProviderProfile from '../models/ProviderProfile';
import ClinicProfile from '../models/ClinicProfile';
import LabProfile from '../models/LabProfile';
import { UserRole, VerificationStatus } from '../constants/enums';

export const getPendingVerifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pendingUsers = await User.find({
      verificationStatus: VerificationStatus.PENDING_VERIFICATION,
    }).select('-passwordHash');

    const result = await Promise.all(
      pendingUsers.map(async (u) => {
        let profile = null;
        if (u.role === UserRole.PROVIDER) {
          profile = await ProviderProfile.findOne({ userId: u._id }).populate('category');
        } else if (u.role === UserRole.CLINIC) {
          profile = await ClinicProfile.findOne({ userId: u._id });
        } else if (u.role === UserRole.LAB) {
          profile = await LabProfile.findOne({ userId: u._id });
        }

        return {
          user: u,
          profile,
        };
      })
    );

    return res.json({ success: true, count: result.length, pendingVerifications: result });
  } catch (error) {
    next(error);
  }
};

export const updateVerificationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { status, rejectionReason } = req.body;

    if (![VerificationStatus.VERIFIED, VerificationStatus.REJECTED].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status target' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    user.verificationStatus = status;
    if (status === VerificationStatus.REJECTED) {
      user.rejectionReason = rejectionReason || 'Information provided did not meet verification standards.';
    } else {
      user.rejectionReason = undefined;
    }

    await user.save();

    return res.json({
      success: true,
      message: `Account verification status updated to ${status}`,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
      },
    });
  } catch (error) {
    next(error);
  }
};
