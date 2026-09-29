import { Request, Response, NextFunction } from 'express';
import LabProfile from '../models/LabProfile';
import User from '../models/User';
import { UserRole, VerificationStatus } from '../constants/enums';

// Get public verified labs
export const getPublicLabs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { city, homeSampleCollection } = req.query;

    const verifiedUsers = await User.find({
      role: UserRole.LAB,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      isBlocked: { $ne: true },
    }).select('_id');

    const filter: any = {
      userId: { $in: verifiedUsers.map((u) => u._id) },
    };

    if (city) filter.city = new RegExp(city as string, 'i');
    if (homeSampleCollection === 'true') filter.homeSampleCollectionAvailable = true;

    const labs = await LabProfile.find(filter)
      .populate('userId', 'email phone verificationStatus')
      .populate('testsOffered');

    return res.json({ success: true, count: labs.length, labs });
  } catch (error) {
    next(error);
  }
};

// Get single lab profile
export const getLabById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    let lab = await LabProfile.findById(id)
      .populate('userId', 'email phone verificationStatus isActive role isBlocked')
      .populate('testsOffered');

    if (!lab) {
      lab = await LabProfile.findOne({ userId: id })
        .populate('userId', 'email phone verificationStatus isActive role isBlocked')
        .populate('testsOffered');
    }

    if (!lab) {
      return res.status(404).json({ success: false, message: 'Lab profile not found' });
    }

    const linkedUser = lab.userId as any;
    const isOwnerOrAdmin = req.user && (req.user.id === linkedUser?._id?.toString() || req.user.role === 'ADMIN');
    
    if (!isOwnerOrAdmin) {
      if (!linkedUser || linkedUser.verificationStatus !== VerificationStatus.VERIFIED || linkedUser.isActive === false || linkedUser.isBlocked) {
        return res.status(404).json({ success: false, message: 'Lab profile not found or unavailable' });
      }
    }

    return res.json({ success: true, lab });
  } catch (error) {
    next(error);
  }
};

// Update own lab profile
export const updateOwnLabProfile = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const profile = await LabProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Lab profile not found' });
    }

    Object.assign(profile, req.body);
    await profile.save();

    return res.json({ success: true, message: 'Lab profile updated successfully', profile });
  } catch (error) {
    next(error);
  }
};
