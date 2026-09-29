import { Request, Response, NextFunction } from 'express';
import ProviderProfile from '../models/ProviderProfile';
import User from '../models/User';
import { UserRole, VerificationStatus } from '../constants/enums';

// Get public verified providers (Filter by category, serviceMode, city)
export const getPublicProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId, homeVisit, clinicVisit, city } = req.query;

    // First find verified provider user IDs (strictly excluding blocked providers)
    const verifiedUsers = await User.find({
      role: UserRole.PROVIDER,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      isBlocked: { $ne: true },
    }).select('_id');

    const verifiedUserIds = verifiedUsers.map((u) => u._id);

    const filter: any = {
      userId: { $in: verifiedUserIds },
    };

    if (categoryId) filter.category = categoryId;
    if (homeVisit === 'true') filter.homeVisitAvailable = true;
    if (clinicVisit === 'true') filter.clinicVisitAvailable = true;
    if (city) filter.city = new RegExp(city as string, 'i');

    const providers = await ProviderProfile.find(filter)
      .populate('userId', 'email phone verificationStatus isBlocked')
      .populate('category')
      .populate('servicesOffered');

    return res.json({ success: true, count: providers.length, providers });
  } catch (error) {
    next(error);
  }
};

// Get single provider profile by ID or User ID
export const getProviderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    let provider = await ProviderProfile.findById(id)
      .populate('userId', 'email phone verificationStatus isBlocked')
      .populate('category')
      .populate('servicesOffered');

    if (!provider) {
      provider = await ProviderProfile.findOne({ userId: id })
        .populate('userId', 'email phone verificationStatus isBlocked')
        .populate('category')
        .populate('servicesOffered');
    }

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    const providerUser = provider.userId as any;
    if (providerUser && providerUser.isBlocked) {
      return res.status(404).json({ success: false, message: 'Provider is temporarily unavailable.' });
    }

    return res.json({ success: true, provider });
  } catch (error) {
    next(error);
  }
};

// Update own profile (Provider logged in)
export const updateOwnProviderProfile = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      qualification,
      experienceYears,
      bio,
      chargesPerSession,
      homeVisitAvailable,
      clinicVisitAvailable,
      serviceLocations,
      workingHours,
      servicesOffered,
      address,
      city,
      pincode,
    } = req.body;

    const profile = await ProviderProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    if (fullName) profile.fullName = fullName;
    if (qualification) profile.qualification = qualification;
    if (experienceYears !== undefined) profile.experienceYears = experienceYears;
    if (bio !== undefined) profile.bio = bio;
    if (chargesPerSession !== undefined) profile.chargesPerSession = chargesPerSession;
    if (homeVisitAvailable !== undefined) profile.homeVisitAvailable = homeVisitAvailable;
    if (clinicVisitAvailable !== undefined) profile.clinicVisitAvailable = clinicVisitAvailable;
    if (serviceLocations) profile.serviceLocations = serviceLocations;
    if (workingHours) profile.workingHours = workingHours;
    if (servicesOffered) profile.servicesOffered = servicesOffered;
    if (address) profile.address = address;
    if (city) profile.city = city;
    if (pincode) profile.pincode = pincode;

    await profile.save();

    return res.json({ success: true, message: 'Profile updated successfully', profile });
  } catch (error) {
    next(error);
  }
};
