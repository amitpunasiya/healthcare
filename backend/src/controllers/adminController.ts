import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import CustomerProfile from '../models/CustomerProfile';
import ProviderProfile from '../models/ProviderProfile';
import LabProfile from '../models/LabProfile';
import ClinicProfile from '../models/ClinicProfile';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import Refund from '../models/Refund';
import Settlement from '../models/Settlement';
import ServiceCategory from '../models/ServiceCategory';
import Service from '../models/Service';
import AuditLog from '../models/AuditLog';
import { UserRole, VerificationStatus, BookingStatus } from '../constants/enums';

// ----------------------------------------------------------------------
// CUSTOMERS MANAGEMENT APIs
// ----------------------------------------------------------------------

export const getAdminCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string || '').trim().toLowerCase();
    const city = (req.query.city as string || '').trim();
    const state = (req.query.state as string || '').trim();
    const status = (req.query.status as string || '').trim(); // 'ACTIVE', 'INACTIVE', 'GUEST', 'BLOCKED'

    // Find all users with CUSTOMER role
    const userFilter: any = { role: UserRole.CUSTOMER };
    if (status === 'ACTIVE') userFilter.isActive = true;
    if (status === 'INACTIVE') userFilter.isActive = false;
    if (status === 'GUEST') userFilter.isGuest = true;
    if (status === 'BLOCKED') userFilter.isBlocked = true;

    const customerUsers = await User.find(userFilter).select('-passwordHash').lean();

    const customerUserIds = customerUsers.map((u) => u._id);

    // Find profiles
    const profileFilter: any = { userId: { $in: customerUserIds } };
    if (city) profileFilter['addresses.city'] = new RegExp(city, 'i');
    if (state) profileFilter['addresses.state'] = new RegExp(state, 'i');

    const profiles = await CustomerProfile.find(profileFilter).lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    // Get booking aggregates for these customers
    const bookingStats = await Booking.aggregate([
      { $match: { customerId: { $in: customerUserIds } } },
      {
        $group: {
          _id: '$customerId',
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: { $cond: [{ $in: ['$status', [BookingStatus.COMPLETED, BookingStatus.PAID]] }, 1, 0] },
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', BookingStatus.CANCELLED] }, 1, 0] },
          },
          activeBookings: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    [
                      BookingStatus.REQUESTED,
                      BookingStatus.SEARCHING,
                      BookingStatus.PENDING,
                      BookingStatus.ACCEPTED,
                      BookingStatus.IN_PROGRESS,
                      BookingStatus.PAYMENT_PENDING,
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalAmountSpent: {
            $sum: {
              $cond: [
                { $in: ['$status', [BookingStatus.COMPLETED, BookingStatus.PAID]] },
                '$pricing.totalAmount',
                0,
              ],
            },
          },
          lastBookingDate: { $max: '$createdAt' },
        },
      },
    ]);

    const statsMap = new Map(bookingStats.map((s) => [s._id.toString(), s]));

    // Combine and apply search filter
    let resultList = customerUsers
      .map((u) => {
        const uId = u._id.toString();
        const profile = profileMap.get(uId);
        const stats = statsMap.get(uId) || {
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          activeBookings: 0,
          totalAmountSpent: 0,
          lastBookingDate: null,
        };

        const defaultAddr = profile?.addresses?.find((a: any) => a.isDefault) || profile?.addresses?.[0];

        return {
          _id: u._id,
          userId: u._id,
          email: u.email,
          phone: u.phone,
          isActive: u.isActive,
          isBlocked: Boolean(u.isBlocked),
          blockedAt: u.blockedAt || null,
          blockedReason: u.blockedReason || null,
          blockedBy: u.blockedBy || null,
          isGuest: u.isGuest,
          createdAt: u.createdAt,
          fullName: profile?.fullName || 'Customer',
          gender: profile?.gender,
          dob: profile?.dob,
          emergencyContact: profile?.emergencyContact,
          city: defaultAddr?.city || '',
          state: defaultAddr?.state || '',
          pincode: defaultAddr?.pincode || '',
          addresses: profile?.addresses || [],
          totalBookings: stats.totalBookings,
          completedBookings: stats.completedBookings,
          cancelledBookings: stats.cancelledBookings,
          activeBookings: stats.activeBookings,
          totalAmountSpent: stats.totalAmountSpent,
          lastBookingDate: stats.lastBookingDate,
        };
      })
      .filter((item) => {
        // If city/state filter was set and profile didn't match (profile null or omitted), omit
        if (city && !profiles.some((p) => p.userId.toString() === item._id.toString())) {
          return false;
        }
        if (search) {
          const matchName = item.fullName.toLowerCase().includes(search);
          const matchEmail = item.email.toLowerCase().includes(search);
          const matchPhone = (item.phone || '').toLowerCase().includes(search);
          const matchCity = item.city.toLowerCase().includes(search);
          if (!matchName && !matchEmail && !matchPhone && !matchCity) return false;
        }
        return true;
      });

    // Sort by createdAt desc
    resultList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = resultList.length;
    const paginatedList = resultList.slice((page - 1) * limit, page * limit);

    return res.json({
      success: true,
      customers: paginatedList,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    let user = await User.findById(id).select('-passwordHash').lean();
    if (!user) {
      // Try finding by CustomerProfile id
      const prof = await CustomerProfile.findById(id).lean();
      if (prof) {
        user = await User.findById(prof.userId).select('-passwordHash').lean();
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer account not found' });
    }

    const profile = await CustomerProfile.findOne({ userId: user._id }).lean();

    // Get all bookings for this customer
    const bookings = await Booking.find({ customerId: user._id })
      .populate('serviceId', 'name basePrice durationMinutes')
      .populate('serviceCategoryId', 'name slug')
      .populate('providerId', 'phone email')
      .sort({ createdAt: -1 })
      .lean();

    // Attach provider profile names if providerId exists
    const populatedBookings = await Promise.all(
      bookings.map(async (b) => {
        let providerName = 'Unassigned Marketplace';
        if (b.providerId) {
          const pProfile = await ProviderProfile.findOne({ userId: (b.providerId as any)._id || b.providerId }).lean();
          if (pProfile) providerName = pProfile.fullName;
        } else if (b.clinicId) {
          const cProfile = await ClinicProfile.findOne({ userId: b.clinicId }).lean();
          if (cProfile) providerName = cProfile.clinicName;
        } else if (b.labId) {
          const lProfile = await LabProfile.findOne({ userId: b.labId }).lean();
          if (lProfile) providerName = lProfile.labName;
        }

        return {
          ...b,
          providerName,
        };
      })
    );

    // Get payments & refunds
    const bookingIds = bookings.map((b) => b._id);
    const payments = await Payment.find({ bookingId: { $in: bookingIds } }).sort({ createdAt: -1 }).lean();
    const refunds = await Refund.find({ bookingId: { $in: bookingIds } }).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      customer: {
        _id: user._id,
        userId: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isGuest: user.isGuest,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        fullName: profile?.fullName || 'Customer',
        gender: profile?.gender,
        dob: profile?.dob,
        emergencyContact: profile?.emergencyContact,
        addresses: profile?.addresses || [],
      },
      bookings: populatedBookings,
      payments,
      refunds,
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// PROVIDERS MANAGEMENT APIs (Includes Physiotherapy, OT, Adult Care)
// ----------------------------------------------------------------------

export const getAdminProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string || '').trim().toLowerCase();
    const categoryQuery = (req.query.category as string || '').trim().toLowerCase();
    const serviceSlug = (req.query.service as string || '').trim().toLowerCase();
    const verificationStatus = (req.query.verificationStatus as string || '').trim();
    const isActiveQuery = req.query.isActive as string;
    const city = (req.query.city as string || '').trim();
    const state = (req.query.state as string || '').trim();

    // Build user filter for PROVIDER role
    const userFilter: any = { role: UserRole.PROVIDER };
    const statusQuery = (req.query.status as string || '').trim();
    if (statusQuery === 'BLOCKED') {
      userFilter.isBlocked = true;
    }
    if (verificationStatus) {
      userFilter.verificationStatus = verificationStatus;
    }
    if (isActiveQuery !== undefined && isActiveQuery !== 'ALL') {
      userFilter.isActive = isActiveQuery === 'true';
    }

    const providerUsers = await User.find(userFilter).select('-passwordHash').lean();
    const providerUserIds = providerUsers.map((u) => u._id);

    // Build profile query
    const profileFilter: any = { userId: { $in: providerUserIds } };
    if (city) profileFilter.city = new RegExp(city, 'i');

    const profiles = await ProviderProfile.find(profileFilter)
      .populate('category')
      .populate('servicesOffered')
      .lean();

    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    // Find category ID if category filter passed (e.g. 'physiotherapy', 'occupational-therapy', 'elder-care')
    let targetCatId: string | null = null;
    const filterCat = categoryQuery || serviceSlug;

    if (filterCat) {
      let slugName = filterCat;
      if (filterCat === 'physiotherapy') slugName = 'physiotherapy';
      else if (filterCat === 'occupational_therapy' || filterCat === 'occupational-therapy') slugName = 'occupational-therapy';
      else if (filterCat === 'adult_care' || filterCat === 'adult-care' || filterCat === 'elder-care' || filterCat === 'elder_care') slugName = 'elder-care';

      const catDoc = await ServiceCategory.findOne({
        $or: [{ slug: slugName }, { name: new RegExp(filterCat.replace(/_/g, ' '), 'i') }],
      }).lean();

      if (catDoc) {
        targetCatId = catDoc._id.toString();
      }
    }

    // Get booking aggregates for providers
    const bookingStats = await Booking.aggregate([
      { $match: { providerId: { $in: providerUserIds } } },
      {
        $group: {
          _id: '$providerId',
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: { $cond: [{ $in: ['$status', [BookingStatus.COMPLETED, BookingStatus.PAID]] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = new Map(bookingStats.map((s) => [s._id.toString(), s]));

    // Combine records
    let resultList = providerUsers
      .map((u) => {
        const uId = u._id.toString();
        const profile = profileMap.get(uId);
        const stats = statsMap.get(uId) || { totalBookings: 0, completedBookings: 0 };

        const categoryObj: any = profile?.category;
        const categoryName = categoryObj?.name || 'General Care';
        const categorySlug = categoryObj?.slug || '';
        const categoryIdStr = categoryObj?._id?.toString() || '';

        return {
          _id: u._id,
          userId: u._id,
          email: u.email,
          phone: u.phone,
          role: u.role,
          verificationStatus: u.verificationStatus,
          rejectionReason: u.rejectionReason,
          isActive: u.isActive,
          isBlocked: Boolean(u.isBlocked),
          blockedAt: u.blockedAt || null,
          blockedReason: u.blockedReason || null,
          blockedBy: u.blockedBy || null,
          createdAt: u.createdAt,
          fullName: profile?.fullName || 'Healthcare Provider',
          photo: profile?.photo,
          categoryName,
          categorySlug,
          categoryId: categoryIdStr,
          qualification: profile?.qualification || 'Certified Healthcare Professional',
          experienceYears: profile?.experienceYears || 0,
          bio: profile?.bio,
          chargesPerSession: profile?.chargesPerSession || 0,
          homeVisitAvailable: profile?.homeVisitAvailable ?? true,
          clinicVisitAvailable: profile?.clinicVisitAvailable ?? false,
          serviceLocations: profile?.serviceLocations || [],
          address: profile?.address || '',
          city: profile?.city || '',
          pincode: profile?.pincode || '',
          servicesOffered: profile?.servicesOffered || [],
          workingHours: profile?.workingHours || [],
          totalBookings: stats.totalBookings,
          completedBookings: stats.completedBookings,
          rating: 4.8, // Default rating representation
        };
      })
      .filter((item) => {
        // Must have a profile record if searching or category filtering
        const hasProfile = profileMap.has(item.userId.toString());
        if (!hasProfile && (city || filterCat || search)) return false;

        // Apply category filter if specified
        if (filterCat) {
          if (targetCatId) {
            const isCatMatch = item.categoryId === targetCatId;
            const isServiceMatch = (item.servicesOffered as any[])?.some(
              (s: any) => s.categoryId?.toString() === targetCatId || s.categoryId === targetCatId
            );
            if (!isCatMatch && !isServiceMatch) return false;
          } else {
            const isNameMatch = item.categoryName.toLowerCase().includes(filterCat.replace(/_/g, ' '));
            if (!isNameMatch) return false;
          }
        }

        if (search) {
          const matchName = item.fullName.toLowerCase().includes(search);
          const matchEmail = item.email.toLowerCase().includes(search);
          const matchPhone = (item.phone || '').toLowerCase().includes(search);
          const matchQual = item.qualification.toLowerCase().includes(search);
          const matchCity = item.city.toLowerCase().includes(search);
          if (!matchName && !matchEmail && !matchPhone && !matchQual && !matchCity) return false;
        }

        return true;
      });

    resultList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = resultList.length;
    const paginatedList = resultList.slice((page - 1) * limit, page * limit);

    return res.json({
      success: true,
      providers: paginatedList,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminProviderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    let user = await User.findById(id).select('-passwordHash').lean();
    if (!user) {
      const prof = await ProviderProfile.findById(id).lean();
      if (prof) {
        user = await User.findById(prof.userId).select('-passwordHash').lean();
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Provider account not found' });
    }

    const profile = await ProviderProfile.findOne({ userId: user._id })
      .populate('category')
      .populate('servicesOffered')
      .populate('degreeDocId')
      .populate('studentIdDocId')
      .populate('aadhaarDocId')
      .populate('panDocId')
      .populate('experienceWorkplaces.certificateDocId')
      .populate('nursingDetails.degreeDocId')
      .populate('nursingDetails.registrationDocId')
      .lean();

    // Get provider bookings
    const bookings = await Booking.find({
      $or: [{ providerId: user._id }, { assignedProviderId: user._id }],
    })
      .populate('serviceId', 'name basePrice durationMinutes')
      .populate('customerId', 'phone email')
      .sort({ createdAt: -1 })
      .lean();

    // Get provider settlements & earnings
    const settlements = await Settlement.find({ entityUserId: user._id }).sort({ createdAt: -1 }).lean();
    const earningsSummary = settlements.reduce(
      (acc, s) => {
        acc.grossTotal += s.grossAmount || 0;
        acc.platformFees += s.platformFee || 0;
        acc.netEarnings += s.netEarning || 0;
        if (s.status === 'SETTLED') acc.settledTotal += s.netEarning || 0;
        else acc.pendingPayable += s.netEarning || 0;
        return acc;
      },
      { grossTotal: 0, platformFees: 0, netEarnings: 0, settledTotal: 0, pendingPayable: 0 }
    );

    return res.json({
      success: true,
      provider: {
        _id: user._id,
        userId: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        fullName: profile?.fullName || 'Healthcare Provider',
        photo: profile?.photo,
        category: profile?.category,
        qualification: profile?.qualification || 'Certified Healthcare Professional',
        experienceYears: profile?.experienceYears || 0,
        experienceType: profile?.experienceType || 'YEARS',
        experienceValue: profile?.experienceValue || 0,
        education: profile?.education || {},
        degreeDocId: profile?.degreeDocId,
        studentIdDocId: profile?.studentIdDocId,
        experienceWorkplaces: profile?.experienceWorkplaces || [],
        aadhaarDocId: profile?.aadhaarDocId,
        panDocId: profile?.panDocId,
        isNurse: profile?.isNurse || false,
        nursingDetails: profile?.nursingDetails || {},
        bio: profile?.bio,
        chargesPerSession: profile?.chargesPerSession || 0,
        homeVisitAvailable: profile?.homeVisitAvailable ?? true,
        clinicVisitAvailable: profile?.clinicVisitAvailable ?? false,
        serviceLocations: profile?.serviceLocations || [],
        address: profile?.address || '',
        city: profile?.city || '',
        pincode: profile?.pincode || '',
        servicesOffered: profile?.servicesOffered || [],
        workingHours: profile?.workingHours || [],
      },
      bookings,
      settlements,
      earningsSummary,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleProviderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Provider user account not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.json({
      success: true,
      message: `Provider account ${user.isActive ? 'activated' : 'suspended'} successfully`,
      isActive: user.isActive,
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// LABS MANAGEMENT APIs
// ----------------------------------------------------------------------

export const getAdminLabs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string || '').trim().toLowerCase();
    const verificationStatus = (req.query.verificationStatus as string || '').trim();
    const isActiveQuery = req.query.isActive as string;
    const city = (req.query.city as string || '').trim();
    const state = (req.query.state as string || '').trim();

    // User filter for LAB role
    const userFilter: any = { role: UserRole.LAB };
    const statusQuery = (req.query.status as string || '').trim();
    if (statusQuery === 'BLOCKED') {
      userFilter.isBlocked = true;
    }
    if (verificationStatus) userFilter.verificationStatus = verificationStatus;
    if (isActiveQuery !== undefined && isActiveQuery !== 'ALL') {
      userFilter.isActive = isActiveQuery === 'true';
    }

    const labUsers = await User.find(userFilter).select('-passwordHash').lean();
    const labUserIds = labUsers.map((u) => u._id);

    // Profile filter
    const profileFilter: any = { userId: { $in: labUserIds } };
    if (city) profileFilter.city = new RegExp(city, 'i');
    if (state) profileFilter.state = new RegExp(state, 'i');

    const profiles = await LabProfile.find(profileFilter)
      .populate('testsOffered')
      .populate('labCertDocId')
      .populate('ownerAadhaarDocId')
      .populate('ownerPanDocId')
      .populate('dmltCertDocId')
      .lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    // Booking statistics for labs
    const bookingStats = await Booking.aggregate([
      { $match: { labId: { $in: labUserIds } } },
      {
        $group: {
          _id: '$labId',
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: { $cond: [{ $in: ['$status', [BookingStatus.COMPLETED, BookingStatus.PAID]] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = new Map(bookingStats.map((s) => [s._id.toString(), s]));

    let resultList = labUsers
      .map((u) => {
        const uId = u._id.toString();
        const profile = profileMap.get(uId);
        const stats = statsMap.get(uId) || { totalBookings: 0, completedBookings: 0 };

        return {
          _id: u._id,
          userId: u._id,
          email: u.email,
          phone: u.phone,
          role: u.role,
          verificationStatus: u.verificationStatus,
          rejectionReason: u.rejectionReason,
          isActive: u.isActive,
          isBlocked: Boolean(u.isBlocked),
          blockedAt: u.blockedAt || null,
          blockedReason: u.blockedReason || null,
          blockedBy: u.blockedBy || null,
          createdAt: u.createdAt,
          labName: profile?.labName || 'Diagnostic Lab Center',
          contactPerson: profile?.contactPerson || 'Lab Director',
          labCertNumber: profile?.labCertNumber,
          labCertDocId: profile?.labCertDocId,
          addressLine1: profile?.addressLine1 || '',
          addressLine2: profile?.addressLine2 || '',
          city: profile?.city || '',
          district: profile?.district || '',
          state: profile?.state || '',
          pincode: profile?.pincode || '',
          ownerFullName: profile?.ownerFullName,
          ownerAadhaarDocId: profile?.ownerAadhaarDocId,
          ownerPanDocId: profile?.ownerPanDocId,
          dmltQualification: profile?.dmltQualification,
          dmltCertNumber: profile?.dmltCertNumber,
          dmltCertDocId: profile?.dmltCertDocId,
          homeSampleCollectionAvailable: profile?.homeSampleCollectionAvailable ?? true,
          labVisitAvailable: profile?.labVisitAvailable ?? true,
          homeCollectionFee: profile?.homeCollectionFee || 150,
          testsOffered: profile?.testsOffered || [],
          totalBookings: stats.totalBookings,
          completedBookings: stats.completedBookings,
        };
      })
      .filter((item) => {
        if (search) {
          const matchName = item.labName.toLowerCase().includes(search);
          const matchPerson = item.contactPerson.toLowerCase().includes(search);
          const matchEmail = item.email.toLowerCase().includes(search);
          const matchPhone = (item.phone || '').toLowerCase().includes(search);
          const matchCity = item.city.toLowerCase().includes(search);
          if (!matchName && !matchPerson && !matchEmail && !matchPhone && !matchCity) return false;
        }
        return true;
      });

    resultList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = resultList.length;
    const paginatedList = resultList.slice((page - 1) * limit, page * limit);

    return res.json({
      success: true,
      labs: paginatedList,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminLabById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    let user = await User.findById(id).select('-passwordHash').lean();
    if (!user) {
      const prof = await LabProfile.findById(id).lean();
      if (prof) {
        user = await User.findById(prof.userId).select('-passwordHash').lean();
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Lab account not found' });
    }

    const profile = await LabProfile.findOne({ userId: user._id })
      .populate('testsOffered')
      .populate('labCertDocId')
      .populate('ownerAadhaarDocId')
      .populate('ownerPanDocId')
      .populate('dmltCertDocId')
      .lean();

    const bookings = await Booking.find({ labId: user._id })
      .populate('serviceId', 'name basePrice durationMinutes')
      .populate('customerId', 'phone email')
      .sort({ createdAt: -1 })
      .lean();

    const settlements = await Settlement.find({ entityUserId: user._id }).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      lab: {
        _id: user._id,
        userId: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        labName: profile?.labName || 'Diagnostic Lab Center',
        contactPerson: profile?.contactPerson || 'Lab Director',
        labCertNumber: profile?.labCertNumber,
        labCertDocId: profile?.labCertDocId,
        addressLine1: profile?.addressLine1 || '',
        addressLine2: profile?.addressLine2 || '',
        city: profile?.city || '',
        district: profile?.district || '',
        state: profile?.state || '',
        pincode: profile?.pincode || '',
        ownerFullName: profile?.ownerFullName,
        ownerAadhaarDocId: profile?.ownerAadhaarDocId,
        ownerPanDocId: profile?.ownerPanDocId,
        dmltQualification: profile?.dmltQualification,
        dmltCertNumber: profile?.dmltCertNumber,
        dmltCertDocId: profile?.dmltCertDocId,
        homeSampleCollectionAvailable: profile?.homeSampleCollectionAvailable ?? true,
        labVisitAvailable: profile?.labVisitAvailable ?? true,
        homeCollectionFee: profile?.homeCollectionFee || 150,
        testsOffered: profile?.testsOffered || [],
        openingHours: profile?.openingHours || [],
      },
      bookings,
      settlements,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleLabStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Lab user account not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.json({
      success: true,
      message: `Lab account ${user.isActive ? 'activated' : 'suspended'} successfully`,
      isActive: user.isActive,
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to dynamically evaluate mandatory document status and update marketplace eligibility
const checkAndUpdateUserMarketplaceEligibility = async (userId: string | mongoose.Types.ObjectId) => {
  const user = await User.findById(userId);
  if (!user) return;

  const Document = mongoose.model('Document');
  let mandatoryDocIds: mongoose.Types.ObjectId[] = [];

  if (user.role === UserRole.PROVIDER) {
    const profile = await ProviderProfile.findOne({ userId: user._id });
    if (!profile) return;

    if (profile.aadhaarDocId) mandatoryDocIds.push(profile.aadhaarDocId);
    if (profile.panDocId) mandatoryDocIds.push(profile.panDocId);

    if (profile.education?.courseStatus === 'COMPLETED' && profile.degreeDocId) {
      mandatoryDocIds.push(profile.degreeDocId);
    } else if (profile.education?.courseStatus === 'CURRENTLY_STUDYING' && profile.studentIdDocId) {
      mandatoryDocIds.push(profile.studentIdDocId);
    }

    if (Array.isArray(profile.experienceWorkplaces)) {
      for (const wp of profile.experienceWorkplaces) {
        if (wp.certificateDocId) mandatoryDocIds.push(wp.certificateDocId);
      }
    }

    if (profile.isNurse && profile.nursingDetails) {
      if (profile.nursingDetails.degreeDocId) mandatoryDocIds.push(profile.nursingDetails.degreeDocId);
      if (profile.nursingDetails.registrationDocId) mandatoryDocIds.push(profile.nursingDetails.registrationDocId);
    }
  } else if (user.role === UserRole.LAB) {
    const profile = await LabProfile.findOne({ userId: user._id });
    if (!profile) return;

    if (profile.labCertDocId) mandatoryDocIds.push(profile.labCertDocId);
    if (profile.ownerAadhaarDocId) mandatoryDocIds.push(profile.ownerAadhaarDocId);
    if (profile.ownerPanDocId) mandatoryDocIds.push(profile.ownerPanDocId);
    if (profile.dmltCertDocId) mandatoryDocIds.push(profile.dmltCertDocId);
  }

  if (mandatoryDocIds.length === 0) return;

  const docs = await Document.find({ _id: { $in: mandatoryDocIds } });

  const hasRejected = docs.some((d: any) => d.status === 'REJECTED');
  const allVerified = docs.length === mandatoryDocIds.length && docs.every((d: any) => d.status === 'VERIFIED');

  if (hasRejected) {
    user.verificationStatus = VerificationStatus.REJECTED;
    const rejectedDoc = docs.find((d: any) => d.status === 'REJECTED');
    if (rejectedDoc) {
      user.rejectionReason = `Document (${rejectedDoc.documentType}) Rejected: ${rejectedDoc.rejectionReason || 'Please upload a clear copy'}`;
    }
  } else if (allVerified) {
    user.verificationStatus = VerificationStatus.VERIFIED;
    user.rejectionReason = undefined;
  } else {
    user.verificationStatus = VerificationStatus.PENDING_VERIFICATION;
  }

  await user.save();
};

// ----------------------------------------------------------------------
// DOCUMENT VERIFICATION & REJECTION API
// ----------------------------------------------------------------------

export const updateDocumentVerificationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { docId } = req.params;
    const { status, rejectionReason } = req.body;

    const document = await mongoose.model('Document').findById(docId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (!['VERIFIED', 'REJECTED', 'UNDER_REVIEW'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Choose VERIFIED, REJECTED, or UNDER_REVIEW' });
    }

    if (status === 'REJECTED') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({ success: false, message: 'Rejection reason is mandatory when rejecting a document' });
      }
      document.status = 'REJECTED';
      document.rejectionReason = rejectionReason.trim();
    } else if (status === 'VERIFIED') {
      document.status = 'VERIFIED';
      document.rejectionReason = null;
    } else {
      document.status = 'UNDER_REVIEW';
    }

    await document.save();

    // Re-evaluate user's marketplace verification status
    if (document.userId) {
      await checkAndUpdateUserMarketplaceEligibility(document.userId);
    }

    return res.json({
      success: true,
      message: `Document status updated to ${status} successfully`,
      document,
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// USER BLOCK & UNBLOCK MANAGEMENT APIs
// ----------------------------------------------------------------------

export const blockUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.id;
    const { reason } = req.body;
    const adminId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid target user ID format.' });
    }

    if (adminId && adminId.toString() === targetUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Administrators cannot block their own account.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (targetUser.role === UserRole.ADMIN) {
      return res.status(403).json({ success: false, message: 'Administrative accounts cannot be blocked.' });
    }

    if (targetUser.isBlocked) {
      return res.status(400).json({
        success: false,
        message: 'This user account is already blocked.',
        isBlocked: true,
        blockedAt: targetUser.blockedAt,
        blockedReason: targetUser.blockedReason,
      });
    }

    const trimmedReason = (reason || '').trim() || 'Violating platform rules or terms of service';
    const blockedDate = new Date();

    targetUser.isBlocked = true;
    targetUser.blockedAt = blockedDate;
    targetUser.blockedReason = trimmedReason;
    targetUser.blockedBy = adminId ? new mongoose.Types.ObjectId(adminId) : null;
    await targetUser.save();

    // Create Audit Log
    await AuditLog.create({
      adminId: adminId ? new mongoose.Types.ObjectId(adminId) : null,
      targetUserId: targetUser._id,
      action: 'BLOCK',
      reason: trimmedReason,
      metadata: {
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        blockedAt: blockedDate,
      },
    });

    return res.json({
      success: true,
      message: `Account for ${targetUser.email} has been successfully blocked.`,
      user: {
        id: targetUser._id,
        email: targetUser.email,
        role: targetUser.role,
        isBlocked: targetUser.isBlocked,
        blockedAt: targetUser.blockedAt,
        blockedReason: targetUser.blockedReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.id;
    const adminId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid target user ID format.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (!targetUser.isBlocked) {
      return res.status(400).json({
        success: false,
        message: 'This user account is not currently blocked.',
      });
    }

    const previousReason = targetUser.blockedReason;
    const previousBlockedAt = targetUser.blockedAt;

    targetUser.isBlocked = false;
    targetUser.blockedAt = null;
    targetUser.blockedReason = null;
    targetUser.blockedBy = null;
    await targetUser.save();

    // Create Audit Log
    await AuditLog.create({
      adminId: adminId ? new mongoose.Types.ObjectId(adminId) : null,
      targetUserId: targetUser._id,
      action: 'UNBLOCK',
      reason: req.body?.reason?.trim() || 'Unblocked by administrator',
      metadata: {
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        previousBlockedReason: previousReason,
        previousBlockedAt: previousBlockedAt,
      },
    });

    return res.json({
      success: true,
      message: `Account for ${targetUser.email} has been successfully unblocked.`,
      user: {
        id: targetUser._id,
        email: targetUser.email,
        role: targetUser.role,
        isBlocked: targetUser.isBlocked,
        blockedAt: targetUser.blockedAt,
        blockedReason: targetUser.blockedReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserAuditLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    const logs = await AuditLog.find({ targetUserId })
      .sort({ createdAt: -1 })
      .populate('adminId', 'email role')
      .lean();

    return res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};
