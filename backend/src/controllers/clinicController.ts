import { Request, Response, NextFunction } from 'express';
import ClinicProfile from '../models/ClinicProfile';
import User from '../models/User';
import { UserRole, VerificationStatus } from '../constants/enums';

// Get public verified clinics
export const getPublicClinics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { city } = req.query;

    const verifiedUsers = await User.find({
      role: UserRole.CLINIC,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
    }).select('_id');

    const filter: any = {
      userId: { $in: verifiedUsers.map((u) => u._id) },
    };

    if (city) filter.city = new RegExp(city as string, 'i');

    const clinics = await ClinicProfile.find(filter)
      .populate('userId', 'email phone verificationStatus')
      .populate('servicesOffered')
      .populate('associatedProviders');

    return res.json({ success: true, count: clinics.length, clinics });
  } catch (error) {
    next(error);
  }
};

// Get single clinic profile
export const getClinicById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    let clinic = await ClinicProfile.findById(id)
      .populate('userId', 'email phone verificationStatus')
      .populate('servicesOffered')
      .populate({
        path: 'associatedProviders',
        populate: { path: 'userId' },
      });

    if (!clinic) {
      clinic = await ClinicProfile.findOne({ userId: id })
        .populate('userId', 'email phone verificationStatus')
        .populate('servicesOffered')
        .populate({
          path: 'associatedProviders',
          populate: { path: 'userId' },
        });
    }

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic profile not found' });
    }

    return res.json({ success: true, clinic });
  } catch (error) {
    next(error);
  }
};

// Update own clinic profile
export const updateOwnClinicProfile = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const profile = await ClinicProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Clinic profile not found' });
    }

    Object.assign(profile, req.body);
    await profile.save();

    return res.json({ success: true, message: 'Clinic profile updated successfully', profile });
  } catch (error) {
    next(error);
  }
};
