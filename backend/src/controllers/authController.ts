import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole, VerificationStatus } from '../constants/enums';
import User from '../models/User';
import CustomerProfile from '../models/CustomerProfile';
import ProviderProfile from '../models/ProviderProfile';
import ClinicProfile from '../models/ClinicProfile';
import LabProfile from '../models/LabProfile';
import ServiceCategory from '../models/ServiceCategory';

const generateToken = (userId: string, role: UserRole, email: string) => {
  return jwt.sign({ id: userId, role, email }, env.JWT_SECRET, {
    expiresIn: '1d' as any,
  });
};

export const registerCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, phone, gender, dob } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: UserRole.CUSTOMER,
      verificationStatus: VerificationStatus.NOT_REQUIRED,
      isGuest: false,
    });

    const profile = await CustomerProfile.create({
      userId: user._id,
      fullName,
      gender,
      dob,
      addresses: [],
    });

    const token = generateToken(user._id.toString(), user.role, user.email);

    return res.status(201).json({
      success: true,
      message: 'Customer account created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        fullName: profile.fullName,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const registerProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      category,
      qualification,
      experienceYears,
      bio,
      chargesPerSession,
      homeVisitAvailable,
      clinicVisitAvailable,
      serviceLocations,
    } = req.body;

    // FIX 1: Validate category exists and is active
    const selectedCategory = await ServiceCategory.findById(category);
    if (!selectedCategory || !selectedCategory.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive service category selected' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: UserRole.PROVIDER,
      verificationStatus: VerificationStatus.PENDING_VERIFICATION,
      isGuest: false,
    });

    const defaultSchedule = [
      { day: 'Monday', available: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Tuesday', available: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Wednesday', available: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Thursday', available: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Friday', available: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Saturday', available: true, startTime: '09:00', endTime: '14:00' },
      { day: 'Sunday', available: false, startTime: '09:00', endTime: '14:00' },
    ];

    const profile = await ProviderProfile.create({
      userId: user._id,
      fullName,
      category: selectedCategory._id,
      qualification,
      experienceYears,
      bio,
      chargesPerSession,
      homeVisitAvailable,
      clinicVisitAvailable,
      serviceLocations: serviceLocations || [],
      workingHours: defaultSchedule,
    });

    const token = generateToken(user._id.toString(), user.role, user.email);

    return res.status(201).json({
      success: true,
      message: 'Provider registration submitted. Your account is pending Admin Verification.',
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        fullName: profile.fullName,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const registerClinic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      clinicName,
      ownerContactPerson,
      phone,
      addressLine1,
      city,
      state,
      pincode,
      description,
      googleMapsUrl,
      homeVisitAvailable,
    } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: UserRole.CLINIC,
      verificationStatus: VerificationStatus.PENDING_VERIFICATION,
      isGuest: false,
    });

    const profile = await ClinicProfile.create({
      userId: user._id,
      clinicName,
      ownerContactPerson,
      phone,
      email,
      addressLine1,
      city,
      state,
      pincode,
      description,
      googleMapsUrl,
      homeVisitAvailable,
    });

    const token = generateToken(user._id.toString(), user.role, user.email);

    return res.status(201).json({
      success: true,
      message: 'Clinic registration submitted. Your account is pending Admin Verification.',
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        clinicName: profile.clinicName,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const registerLab = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      labName,
      contactPerson,
      phone,
      addressLine1,
      city,
      state,
      pincode,
      description,
      homeSampleCollectionAvailable,
      labVisitAvailable,
      homeCollectionFee,
    } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: UserRole.LAB,
      verificationStatus: VerificationStatus.PENDING_VERIFICATION,
      isGuest: false,
    });

    const profile = await LabProfile.create({
      userId: user._id,
      labName,
      contactPerson,
      phone,
      email,
      addressLine1,
      city,
      state,
      pincode,
      description,
      homeSampleCollectionAvailable,
      labVisitAvailable,
      homeCollectionFee,
    });

    const token = generateToken(user._id.toString(), user.role, user.email);

    return res.status(201).json({
      success: true,
      message: 'Diagnostic Lab registration submitted. Your account is pending Admin Verification.',
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        labName: profile.labName,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or disabled account' });
    }

    // FIX 2: Guest accounts cannot log in directly
    if (user.isGuest) {
      return res.status(401).json({ success: false, message: 'Guest customer account cannot log in directly. Please register.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash || '');
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    let profileData: any = {};
    if (user.role === UserRole.CUSTOMER) {
      profileData = await CustomerProfile.findOne({ userId: user._id });
    } else if (user.role === UserRole.PROVIDER) {
      profileData = await ProviderProfile.findOne({ userId: user._id }).populate('category');
    } else if (user.role === UserRole.CLINIC) {
      profileData = await ClinicProfile.findOne({ userId: user._id });
    } else if (user.role === UserRole.LAB) {
      profileData = await LabProfile.findOne({ userId: user._id });
    }

    const token = generateToken(user._id.toString(), user.role, user.email);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
        profile: profileData,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let profileData: any = {};
    if (user.role === UserRole.CUSTOMER) {
      profileData = await CustomerProfile.findOne({ userId: user._id });
    } else if (user.role === UserRole.PROVIDER) {
      profileData = await ProviderProfile.findOne({ userId: user._id }).populate('category').populate('servicesOffered');
    } else if (user.role === UserRole.CLINIC) {
      profileData = await ClinicProfile.findOne({ userId: user._id }).populate('servicesOffered');
    } else if (user.role === UserRole.LAB) {
      profileData = await LabProfile.findOne({ userId: user._id }).populate('testsOffered');
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
        profile: profileData,
      },
    });
  } catch (error) {
    next(error);
  }
};
