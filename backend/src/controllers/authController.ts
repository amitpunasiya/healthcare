import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole, VerificationStatus } from '../constants/enums';
import User from '../models/User';
import CustomerProfile from '../models/CustomerProfile';
import ProviderProfile from '../models/ProviderProfile';
import ClinicProfile from '../models/ClinicProfile';
import LabProfile from '../models/LabProfile';
import ServiceCategory from '../models/ServiceCategory';
import { recordAuthFailure, recordAuthSuccess } from '../middlewares/rateLimiter';
import { hashPassword, verifyPassword } from '../utils/passwordSecurity';

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

    const passwordHash = await hashPassword(password);
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
      experienceType,
      experienceValue,
      education,
      degreeDocId,
      studentIdDocId,
      experienceWorkplaces,
      aadhaarDocId,
      panDocId,
      isNurse,
      nursingDetails,
      bio,
      chargesPerSession,
      homeVisitAvailable,
      clinicVisitAvailable,
      serviceLocations,
    } = req.body;

    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required basic fields: email, password, fullName, phone' });
    }

    // Validate category exists and is active (supports ObjectId, slug, or name fallback)
    let selectedCategory: any = null;
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      selectedCategory = await ServiceCategory.findById(category);
    }
    if (!selectedCategory && category) {
      selectedCategory = await ServiceCategory.findOne({
        $or: [
          { slug: category.toString().toLowerCase() },
          { name: new RegExp(category.toString(), 'i') },
        ],
        isActive: true,
      });
    }
    if (!selectedCategory) {
      selectedCategory = await ServiceCategory.findOne({ isActive: true }).sort({ displayOrder: 1 });
    }

    if (!selectedCategory) {
      return res.status(400).json({ success: false, message: 'No active service category found. Please contact support.' });
    }

    // Education details (support both structured and simplified mobile registration)
    const cleanEducation = {
      collegeName: education?.collegeName || req.body.collegeName || 'Healthcare Medical Institute',
      courseName: education?.courseName || qualification || selectedCategory.name || 'Medical Care',
      startYear: Number(education?.startYear || 2020),
      completionYear: Number(education?.completionYear || 2024),
      courseStatus: education?.courseStatus || 'COMPLETED',
      studentIdNumber: education?.studentIdNumber || '',
    };

    // Experience details
    const totalExp = Number(experienceValue || experienceYears || 1);

    // Nurse details if applicable
    const isElderCare = ['elder-care', 'adult-care'].includes(selectedCategory.slug) || /elder|adult/i.test(selectedCategory.name);
    const cleanNursingDetails = isElderCare && Boolean(isNurse) ? nursingDetails : undefined;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const passwordHash = await hashPassword(password);
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
      qualification: qualification || selectedCategory.name,
      experienceYears: totalExp,
      experienceType: experienceType || 'YEARS',
      experienceValue: totalExp,
      education: cleanEducation,
      degreeDocId: degreeDocId || null,
      studentIdDocId: studentIdDocId || null,
      profilePhotoDocId: req.body.profilePhotoDocId || req.body.selfieDocId || null,
      experienceCertDocId: req.body.experienceCertDocId || null,
      labCertDocId: req.body.labCertDocId || null,
      experienceWorkplaces: Array.isArray(experienceWorkplaces) ? experienceWorkplaces : [],
      aadhaarDocId: aadhaarDocId || null,
      panDocId: panDocId || null,
      aadhaarNumber: req.body.aadhaarNumber || null,
      panNumber: req.body.panNumber || null,
      isNurse: Boolean(isNurse),
      nursingDetails: cleanNursingDetails || {},
      bio: bio || '',
      chargesPerSession: chargesPerSession ? Number(chargesPerSession) : 500,
      homeVisitAvailable: homeVisitAvailable ?? true,
      clinicVisitAvailable: clinicVisitAvailable ?? false,
      serviceLocations:
        Array.isArray(serviceLocations) && serviceLocations.length > 0
          ? serviceLocations
          : [req.body.city?.trim() || 'Indore'],
      workingHours: defaultSchedule,
    });

    // Associate any pre-uploaded temporary documents with this newly created user ID
    const attachedDocIds = [
      req.body.profilePhotoDocId,
      req.body.selfieDocId,
      degreeDocId,
      studentIdDocId,
      req.body.experienceCertDocId,
      req.body.labCertDocId,
      aadhaarDocId,
      panDocId,
      nursingDetails?.degreeDocId,
      nursingDetails?.registrationDocId,
      ...(Array.isArray(experienceWorkplaces) ? experienceWorkplaces.map((w: any) => w.certificateDocId) : []),
    ].filter(Boolean);

    if (attachedDocIds.length > 0) {
      await mongoose.model('Document').updateMany(
        { _id: { $in: attachedDocIds } },
        { $set: { userId: user._id } }
      );
    }

    const token = generateToken(user._id.toString(), user.role, user.email);

    return res.status(201).json({
      success: true,
      message: 'Provider registration submitted with documents. Your account is pending Admin Verification.',
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

    const passwordHash = await hashPassword(password);
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
      diagnosticCenterName,
      contactPerson,
      fullName,
      phone,
      labCertNumber,
      labCertDocId,
      addressLine1,
      labAddress,
      city,
      district,
      state,
      pincode,
      ownerFullName,
      ownerAadhaarDocId,
      ownerPanDocId,
      dmltQualification,
      dmltCertNumber,
      dmltCertDocId,
      description,
      homeSampleCollectionAvailable,
      labVisitAvailable,
      homeCollectionFee,
    } = req.body;

    const finalLabName = (labName || diagnosticCenterName || '').trim();
    const finalContactPerson = (contactPerson || fullName || ownerFullName || '').trim();
    const finalAddress = (addressLine1 || labAddress || '').trim();
    const finalCity = (city || '').trim();
    const finalDistrict = (district || city || '').trim();
    const finalState = (state || '').trim();
    const finalPincode = (pincode || '').trim();

    if (!email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Missing basic credentials: email, password, phone' });
    }
    if (!finalLabName) {
      return res.status(400).json({ success: false, message: 'Lab name is mandatory' });
    }
    if (!labCertNumber || !labCertDocId) {
      return res.status(400).json({ success: false, message: 'Laboratory License/Registration Number and Certificate Document are mandatory' });
    }
    if (!finalAddress || !finalCity || !finalState || !finalPincode) {
      return res.status(400).json({ success: false, message: 'Complete laboratory address details (Address, City, State, Pincode) are mandatory' });
    }
    if (!ownerFullName || !ownerAadhaarDocId || !ownerPanDocId) {
      return res.status(400).json({ success: false, message: 'Lab Owner Name, Owner Aadhaar Document, and Owner PAN Document are mandatory' });
    }
    if (!dmltQualification || !dmltCertNumber || !dmltCertDocId) {
      return res.status(400).json({ success: false, message: 'DMLT Qualification, Certificate Number, and DMLT Certificate Document are mandatory' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const passwordHash = await hashPassword(password);
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
      labName: finalLabName,
      contactPerson: finalContactPerson,
      phone,
      email,
      labCertNumber,
      labCertDocId,
      addressLine1: finalAddress,
      city: finalCity,
      district: finalDistrict,
      state: finalState,
      pincode: finalPincode,
      ownerFullName,
      ownerAadhaarDocId,
      ownerPanDocId,
      dmltQualification,
      dmltCertNumber,
      dmltCertDocId,
      description,
      homeSampleCollectionAvailable: homeSampleCollectionAvailable ?? true,
      labVisitAvailable: labVisitAvailable ?? true,
      homeCollectionFee: homeCollectionFee ?? 150,
    });

    // Associate any pre-uploaded temporary documents with this newly created user ID
    const attachedDocIds = [
      labCertDocId,
      ownerAadhaarDocId,
      ownerPanDocId,
      dmltCertDocId,
    ].filter(Boolean);

    if (attachedDocIds.length > 0) {
      await mongoose.model('Document').updateMany(
        { _id: { $in: attachedDocIds } },
        { $set: { userId: user._id } }
      );
    }

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
    const accountIdentifier = email || (req.body as any).phone || '';

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive || user.isGuest) {
      await recordAuthFailure(accountIdentifier, req.ip || req.socket.remoteAddress || 'unknown');
      console.warn('[LOGIN FAILED ATTEMPT]:', {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        account: email,
        reason: !user ? 'User not found' : !user.isActive ? 'Account deactivated' : 'Guest account attempt',
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: `Your account has been blocked by an administrator. Reason: ${user.blockedReason || 'Policy or terms violation'}. Please contact support for assistance.`,
      });
    }

    const { isValid: isMatch, needsRehash: shouldRehash, detectedFormat } = await verifyPassword(
      password,
      user.passwordHash || ''
    );

    if (!isMatch) {
      await recordAuthFailure(accountIdentifier, req.ip || req.socket.remoteAddress || 'unknown');
      console.warn('[LOGIN FAILED ATTEMPT]:', {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        account: email,
        reason: 'Password mismatch',
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Lazy Migration: Transparently rehash legacy passwords (plaintext, MD5, SHA-1) or low-cost bcrypt hashes on successful login
    if (shouldRehash) {
      try {
        user.passwordHash = await hashPassword(password);
        await user.save();
        console.info(
          `[PASSWORD MIGRATION] Automatically rehashed user ${user.email} from ${detectedFormat} to bcrypt cost factor 12.`
        );
      } catch (rehashError) {
        console.error('[PASSWORD MIGRATION ERROR]: Failed to persist upgraded password hash:', rehashError);
      }
    }

    // Successful login: Reset account backoff counter
    recordAuthSuccess(accountIdentifier);

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
        fullName: profileData?.fullName || '',
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
        profile: profileData,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifySelf = async (req: any, res: Response, next: NextFunction) => {
  try {
    const isDevEnvironment =
      process.env.NODE_ENV === 'development' ||
      process.env.ALLOW_DEV_SELF_VERIFICATION === 'true';

    if (!isDevEnvironment) {
      return res.status(403).json({
        success: false,
        message: 'Self-verification is disabled in production environment. Account verification requires administrator approval.',
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === UserRole.CUSTOMER) {
      return res.status(403).json({
        success: false,
        message: 'Customer accounts do not require professional verification.',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    user.verificationStatus = VerificationStatus.VERIFIED;
    user.rejectionReason = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Account auto-verified successfully for local development/testing',
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password Request (Generates secure single-use token)
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    // Security: Generic response to prevent account enumeration
    const genericResponse = {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    };

    const user = await User.findOne({ email: normalizedEmail, isActive: true });
    if (!user) {
      return res.json(genericResponse);
    }

    // Generate cryptographically secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store SHA-256 hash of token in DB
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordTokenHash = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
    await user.save();

    const devResetUrl = `http://localhost:5173/auth/reset-password/${resetToken}`;

    return res.json({
      ...genericResponse,
      ...(process.env.NODE_ENV !== 'production' ? { devResetUrl, resetToken } : {}),
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password Handler (Validates token hash, updates password)
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordTokenHash: resetTokenHash,
      resetPasswordExpires: { $gt: new Date() },
      isActive: true,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired. Please request a new password reset link.',
      });
    }

    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// Change Password for authenticated user
export const changePassword = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({ success: false, message: 'User account not found or deactivated' });
    }

    // Verify current password against stored hash (constant-time verification)
    const { isValid: isMatch } = await verifyPassword(currentPassword, user.passwordHash || '');
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    // Securely hash new password with bcrypt cost factor >= 12
    const newPasswordHash = await hashPassword(newPassword);
    user.passwordHash = newPasswordHash;
    await user.save();

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};
