import { Response, NextFunction } from 'express';
import Booking, { PlanStatus } from '../models/Booking';
import Service from '../models/Service';
import CustomerProfile from '../models/CustomerProfile';
import ProviderProfile from '../models/ProviderProfile';
import LabProfile from '../models/LabProfile';
import ServiceCategory from '../models/ServiceCategory';
import User from '../models/User';
import Settlement from '../models/Settlement';
import Payment from '../models/Payment';
import { AuthRequest } from '../middlewares/auth';
import { BookingSource, BookingStatus, PaymentStatus, UserRole, VerificationStatus } from '../constants/enums';
import { generateRecurringSessions } from '../services/recurringEngine';
import { createNotification } from '../services/notificationService';
import { createEarningLedgerRecord } from './settlementController';
import { validateIndianAddress } from '../utils/indiaValidation';
import { calculateHaversineDistance } from '../utils/distance';

const generateBookingNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `CP-${dateStr}-${random4}`;
};

// State transition validation matrix
const ALLOWED_TRANSITIONS: { [key in BookingStatus]?: BookingStatus[] } = {
  [BookingStatus.REQUESTED]: [BookingStatus.ACCEPTED, BookingStatus.REJECTED, BookingStatus.CANCELLED, BookingStatus.NO_PROVIDER_FOUND],
  [BookingStatus.SEARCHING]: [BookingStatus.ACCEPTED, BookingStatus.REJECTED, BookingStatus.CANCELLED, BookingStatus.NO_PROVIDER_FOUND],
  [BookingStatus.PENDING]: [BookingStatus.ACCEPTED, BookingStatus.REJECTED, BookingStatus.CANCELLED, BookingStatus.NO_PROVIDER_FOUND],
  [BookingStatus.ACCEPTED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.PAYMENT_PENDING, BookingStatus.CANCELLED],
  [BookingStatus.COMPLETED]: [BookingStatus.PAYMENT_PENDING, BookingStatus.PAID],
  [BookingStatus.PAYMENT_PENDING]: [BookingStatus.PAID, BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.PAID]: [],
  [BookingStatus.NO_PROVIDER_FOUND]: [BookingStatus.REQUESTED, BookingStatus.CANCELLED],
  [BookingStatus.REJECTED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.NO_SHOW]: [],
};

// Helper: Conflict Checker for Single Booking Slot
const checkSlotConflict = async (entityId: { providerId?: any; clinicId?: any; labId?: any }, date: string, startTime: string, excludeBookingId?: string) => {
  const filter: any = {
    bookingDate: date,
    'timeSlot.startTime': startTime,
    status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS] },
  };

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  if (entityId.providerId) filter.providerId = entityId.providerId;
  if (entityId.clinicId) filter.clinicId = entityId.clinicId;
  if (entityId.labId) filter.labId = entityId.labId;

  const conflict = await Booking.findOne(filter);
  return conflict;
};

// Create Online Booking (Customer Request - Post-Service Payment Model)
export const createOnlineBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.user!.id;
    const {
      providerId,
      clinicId,
      labId,
      serviceCategoryId,
      serviceId,
      serviceMode,
      engagementType,
      recurringConfig,
      serviceAddress,
      bookingDate,
      timeSlot,
      notes,
    } = req.body;

    const targetService = await Service.findById(serviceId);
    if (!targetService || !targetService.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive service requested' });
    }

    // ONLY HOME_VISIT IS ALLOWED FOR NEW CUSTOMER BOOKINGS
    if (serviceMode !== 'HOME_VISIT') {
      return res.status(400).json({
        success: false,
        message: 'Only HOME_VISIT bookings are supported. Clinic Visit and Lab Visit physical appointments have been removed.',
      });
    }

    // SERVER-SIDE INDIA LOCATION VALIDATION
    if (serviceMode === 'HOME_VISIT' && serviceAddress) {
      const indiaCheck = validateIndianAddress(serviceAddress);
      if (!indiaCheck.isValid) {
        return res.status(400).json({
          success: false,
          message: indiaCheck.message || 'Sorry, our services are currently available only in India.',
        });
      }
    }

    const customerUser = await User.findById(customerId);
    if (!customerUser || !customerUser.isActive) {
      return res.status(401).json({ success: false, message: 'Customer account not found or inactive' });
    }
    if (customerUser.isBlocked) {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: `Your account has been blocked by an administrator. Reason: ${customerUser.blockedReason || 'Policy violation'}. You cannot create new bookings.`,
      });
    }

    if (providerId) {
      const providerUser = await User.findById(providerId);
      if (providerUser && providerUser.isBlocked) {
        return res.status(400).json({
          success: false,
          message: 'The selected provider is currently unavailable.',
        });
      }
    }

    const customerProfile = await CustomerProfile.findOne({ userId: customerId });

    let homeFee = 0;
    if (serviceMode === 'HOME_VISIT' || serviceMode === 'LAB_VISIT') {
      homeFee = labId ? 150 : 0;
    }

    const totalAmount = targetService.basePrice + homeFee;
    const isRecurring = engagementType === 'REGULAR_RECURRING';

    // SERVER-SIDE CATEGORY SELECTIVE DISCOVERY & MATCHING (RAPIDO STYLE)
    let eligibleProviderResponses: Array<{ providerId: any; status: string; distance: number }> = [];
    let nearbyProviderCount = 0;
    let initialStatus = BookingStatus.REQUESTED;

    const targetCatDoc = await ServiceCategory.findById(serviceCategoryId);
    const categorySlug = targetCatDoc?.slug || '';
    const isLabCategory = categorySlug === 'lab-tests' || targetCatDoc?.name?.toLowerCase().includes('lab');

    if (serviceMode === 'HOME_VISIT') {
      const patientLat = serviceAddress?.latitude;
      const patientLng = serviceAddress?.longitude;

      if (isLabCategory) {
        // LAB TEST REQUEST: Match ONLY verified active Labs offering home sample collection
        const verifiedLabs = await User.find({
          role: UserRole.LAB,
          verificationStatus: VerificationStatus.VERIFIED,
          isActive: true,
          isBlocked: { $ne: true },
        }).select('_id email phone');

        const labUserIds = verifiedLabs.map((u) => u._id);
        const labProfiles = await LabProfile.find({
          userId: { $in: labUserIds },
          homeSampleCollectionAvailable: true,
        });

        const matchingLabs: Array<{ userId: any; distance: number }> = [];
        for (const lProfile of labProfiles) {
          let dist = 1.5;
          if (patientLat && patientLng && lProfile.latitude && lProfile.longitude) {
            dist = calculateHaversineDistance(patientLat, patientLng, lProfile.latitude, lProfile.longitude);
          } else if (lProfile.city && serviceAddress?.city && lProfile.city.toLowerCase() === serviceAddress.city.toLowerCase()) {
            dist = 2.0;
          }

          if (dist <= 15.0 || !patientLat) {
            matchingLabs.push({ userId: lProfile.userId, distance: dist });
          }
        }

        matchingLabs.sort((a, b) => a.distance - b.distance);

        if (labId) {
          const targetLabUser = await User.findById(labId);
          if (targetLabUser && targetLabUser.isBlocked) {
            return res.status(400).json({ success: false, message: 'The selected lab is currently unavailable.' });
          }
          eligibleProviderResponses = [{ providerId: labId, status: 'PENDING', distance: 1.0 }];
          nearbyProviderCount = 1;
        } else {
          eligibleProviderResponses = matchingLabs.map((ml) => ({
            providerId: ml.userId,
            status: 'PENDING',
            distance: ml.distance,
          }));
          nearbyProviderCount = matchingLabs.length;
        }
        initialStatus = nearbyProviderCount > 0 ? BookingStatus.REQUESTED : BookingStatus.NO_PROVIDER_FOUND;
      } else {
        // INDIVIDUAL HEALTHCARE PROVIDER REQUEST (Physiotherapy, Occupational Therapy, Adult Care)
        const verifiedUsers = await User.find({
          role: UserRole.PROVIDER,
          verificationStatus: VerificationStatus.VERIFIED,
          isActive: true,
          isBlocked: { $ne: true },
        }).select('_id fullName email phone photo verificationStatus');

        const providerUserIds = verifiedUsers.map((u) => u._id);
        const providerProfiles = await ProviderProfile.find({
          userId: { $in: providerUserIds },
          homeVisitAvailable: true,
        });

        const matchingProviders: Array<{ userId: any; distance: number }> = [];

        for (const pProfile of providerProfiles) {
          // STRICT CATEGORY OR SERVICE MATCHING
          const catMatch =
            pProfile.category &&
            (pProfile.category.toString() === serviceCategoryId.toString() ||
              (typeof pProfile.category === 'object' && (pProfile.category as any)._id?.toString() === serviceCategoryId.toString()));
          const srvMatch =
            pProfile.servicesOffered &&
            pProfile.servicesOffered.some(
              (s: any) =>
                s.toString() === serviceId.toString() || (typeof s === 'object' && s._id?.toString() === serviceId.toString())
            );

          if (catMatch || srvMatch) {
            let dist = 1.5;
            if (patientLat && patientLng && pProfile.latitude && pProfile.longitude) {
              dist = calculateHaversineDistance(patientLat, patientLng, pProfile.latitude, pProfile.longitude);
            } else if (pProfile.city && serviceAddress?.city && pProfile.city.toLowerCase() === serviceAddress.city.toLowerCase()) {
              dist = 2.0;
            }

            if (dist <= 15.0 || !patientLat) {
              matchingProviders.push({ userId: pProfile.userId, distance: dist });
            }
          }
        }

        matchingProviders.sort((a, b) => a.distance - b.distance);

        if (providerId) {
          const foundSpec = matchingProviders.find((mp) => mp.userId.toString() === providerId.toString());
          eligibleProviderResponses = [
            {
              providerId,
              status: 'PENDING',
              distance: foundSpec ? foundSpec.distance : 1.0,
            },
          ];
          nearbyProviderCount = 1;
          initialStatus = BookingStatus.REQUESTED;
        } else {
          eligibleProviderResponses = matchingProviders.map((mp) => ({
            providerId: mp.userId,
            status: 'PENDING',
            distance: mp.distance,
          }));
          nearbyProviderCount = matchingProviders.length;
          initialStatus = nearbyProviderCount > 0 ? BookingStatus.REQUESTED : BookingStatus.NO_PROVIDER_FOUND;
        }
      }
    } else {
      initialStatus = BookingStatus.PENDING;
    }

    const serviceOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create Booking Document
    const booking = await Booking.create({
      bookingNumber: generateBookingNumber(),
      bookingSource: BookingSource.ONLINE,
      createdById: customerId,
      customerId,
      customerDetails: {
        name: customerProfile?.fullName || (customerUser as any)?.fullName || customerUser?.email?.split('@')[0] || 'Customer',
        phone: customerUser?.phone || '',
        email: customerUser?.email,
      },
      providerId: providerId || undefined,
      clinicId,
      labId,
      serviceCategoryId,
      serviceId,
      serviceMode,
      engagementType: engagementType || 'ONE_TIME',

      isRecurringParent: isRecurring,
      planStatus: isRecurring ? PlanStatus.ACTIVE : undefined,
      recurringConfig: isRecurring
        ? {
            frequency: recurringConfig?.frequency || 'DAILY',
            startDate: bookingDate,
            durationWeeks: recurringConfig?.durationWeeks || 2,
            preferredTimeSlot: timeSlot,
            daysOfWeek: recurringConfig?.daysOfWeek || [],
          }
        : undefined,

      serviceAddress,
      bookingDate,
      timeSlot,
      pricing: {
        baseFee: targetService.basePrice,
        homeCollectionFee: homeFee,
        discountFee: 0,
        totalAmount,
      },
      nearbyProviderCount,
      providerResponses: eligibleProviderResponses,
      paymentStatus: 'PENDING',
      status: initialStatus,
      serviceOtp,
      serviceOtpHash: serviceOtp,
      statusHistory: [
        {
          status: initialStatus,
          changedBy: customerId as any,
          timestamp: new Date(),
          notes: isRecurring
            ? 'Recurring Parent Hiring Plan created'
            : `Service request created. Discovered ${nearbyProviderCount} nearby providers within 5 km. Payment pending until service completion.`,
        },
      ],
      notes,
    });

    let sessionEngineResult = null;
    if (isRecurring) {
      sessionEngineResult = await generateRecurringSessions({
        parentBooking: booking,
        durationWeeks: recurringConfig?.durationWeeks || 2,
      });
    }

    // Broadcast Notifications to Eligible Nearby Providers
    for (const pResp of eligibleProviderResponses) {
      await createNotification(
        pResp.providerId,
        'New Nearby Service Request',
        `New ${serviceMode.replace('_', ' ')} request #${booking.bookingNumber} for ${targetService.name} within ${pResp.distance} km.`,
        'BOOKING_CREATED',
        booking._id.toString()
      );
    }

    return res.status(201).json({
      success: true,
      message: isRecurring
        ? `Personal/Regular Hiring Plan created. Generated ${sessionEngineResult?.totalGenerated} recurring sessions.`
        : `Service request created successfully. Finding nearby specialists within 5 km.`,
      booking,
      recurringSessionsInfo: sessionEngineResult,
    });
  } catch (error) {
    next(error);
  }
};

// Create Manual Booking (Admin/Staff)
export const createManualBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const createdById = req.user!.id;
    const {
      customerId,
      customerDetails,
      providerId,
      clinicId,
      labId,
      serviceCategoryId,
      serviceId,
      serviceMode,
      engagementType,
      recurringConfig,
      serviceAddress,
      bookingDate,
      timeSlot,
      notes,
    } = req.body;

    const targetService = await Service.findById(serviceId);
    if (!targetService || !targetService.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive service' });
    }

    if (customerId) {
      const custUser = await User.findById(customerId);
      if (custUser && custUser.isBlocked) {
        return res.status(400).json({ success: false, message: 'Cannot create booking for a blocked customer account.' });
      }
    }

    if (providerId) {
      const provUser = await User.findById(providerId);
      if (provUser && provUser.isBlocked) {
        return res.status(400).json({ success: false, message: 'Cannot assign a blocked provider.' });
      }
    }

    if (clinicId) {
      const clinicUser = await User.findById(clinicId);
      if (clinicUser && clinicUser.isBlocked) {
        return res.status(400).json({ success: false, message: 'Cannot assign a blocked clinic.' });
      }
    }

    if (labId) {
      const labUser = await User.findById(labId);
      if (labUser && labUser.isBlocked) {
        return res.status(400).json({ success: false, message: 'Cannot assign a blocked lab.' });
      }
    }

    const totalAmount = targetService.basePrice;
    const isRecurring = engagementType === 'REGULAR_RECURRING';

    const booking = await Booking.create({
      bookingNumber: generateBookingNumber(),
      bookingSource: BookingSource.MANUAL,
      createdById,
      customerId,
      customerDetails,
      providerId,
      clinicId,
      labId,
      serviceCategoryId,
      serviceId,
      serviceMode,
      engagementType: engagementType || 'ONE_TIME',

      isRecurringParent: isRecurring,
      planStatus: isRecurring ? PlanStatus.ACTIVE : undefined,
      recurringConfig: isRecurring
        ? {
            frequency: recurringConfig?.frequency || 'DAILY',
            startDate: bookingDate,
            durationWeeks: recurringConfig?.durationWeeks || 2,
            preferredTimeSlot: timeSlot,
            daysOfWeek: recurringConfig?.daysOfWeek || [],
          }
        : undefined,

      serviceAddress,
      bookingDate,
      timeSlot,
      pricing: {
        baseFee: targetService.basePrice,
        homeCollectionFee: 0,
        discountFee: 0,
        totalAmount,
      },
      status: BookingStatus.ACCEPTED,
      statusHistory: [
        {
          status: BookingStatus.ACCEPTED,
          changedBy: createdById as any,
          timestamp: new Date(),
          notes: 'Manual booking created by admin/staff',
        },
      ],
      notes,
    });

    return res.status(201).json({ success: true, message: 'Manual booking created successfully', booking });
  } catch (error) {
    next(error);
  }
};

// Get My Bookings (Customer / Provider)
export const getMyBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const filter: any = {};
    if (role === UserRole.CUSTOMER) filter.customerId = userId;
    else if (role === UserRole.PROVIDER) {
      filter.$or = [
        { providerId: userId },
        { assignedProviderId: userId },
        { 'providerResponses.providerId': userId },
        {
          providerId: { $in: [null, undefined] },
          status: { $in: [BookingStatus.REQUESTED, BookingStatus.SEARCHING, BookingStatus.PENDING] },
          serviceMode: 'HOME_VISIT',
        },
      ];
    } else if (role === UserRole.CLINIC) filter.clinicId = userId;
    else if (role === UserRole.LAB) filter.labId = userId;

    const bookings = await Booking.find(filter)
      .populate('customerId', 'fullName phone email')
      .populate('serviceCategoryId')
      .populate('serviceId')
      .populate('providerId', 'fullName photo qualification experienceYears verificationStatus')
      .populate('clinicId')
      .populate('labId')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// Get Provider Specific Bookings & Live Broadcast Requests (Category Selective Match)
export const getProviderBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId).lean();
    const isVerified = user?.verificationStatus === VerificationStatus.VERIFIED;
    const verificationStatus = user?.verificationStatus || VerificationStatus.PENDING_VERIFICATION;

    // Strict Rule: Unverified providers cannot view or accept patient requests
    if (!isVerified) {
      return res.json({
        success: true,
        isVerified: false,
        verificationStatus,
        rejectionReason: user?.rejectionReason,
        count: 0,
        bookings: [],
      });
    }

    const providerProfile = await ProviderProfile.findOne({ userId }).lean();

    // Find Lab Tests category ID to exclude lab test requests from individual provider feeds
    const labCatDoc = await ServiceCategory.findOne({ slug: { $in: ['lab-test', 'lab-tests'] } }).lean();
    const labCatId = labCatDoc?._id;

    const providerCategory = providerProfile?.category;
    const servicesOffered = providerProfile?.servicesOffered || [];

    // Current date string (YYYY-MM-DD) to prevent past expired orders from showing
    const todayStr = new Date().toISOString().split('T')[0];

    // Clean up expired unassigned requests from past days
    await Booking.updateMany(
      {
        providerId: { $in: [null, undefined] },
        status: { $in: [BookingStatus.REQUESTED, BookingStatus.SEARCHING, BookingStatus.PENDING] },
        bookingDate: { $lt: todayStr },
      },
      {
        $set: {
          status: BookingStatus.CANCELLED,
          cancellationReason: 'Expired: Unassigned before scheduled date',
        },
      }
    );

    const unassignedFilter: any = {
      providerId: { $in: [null, undefined] },
      status: { $in: [BookingStatus.REQUESTED, BookingStatus.SEARCHING, BookingStatus.PENDING] },
      serviceMode: 'HOME_VISIT',
      bookingDate: { $gte: todayStr }, // Only current and future bookings!
    };

    if (labCatId) {
      unassignedFilter.serviceCategoryId = { $ne: labCatId };
    }

    if (providerCategory || servicesOffered.length > 0) {
      unassignedFilter.$or = [
        ...(providerCategory ? [{ serviceCategoryId: providerCategory }] : []),
        ...(servicesOffered.length > 0 ? [{ serviceId: { $in: servicesOffered } }] : []),
      ];
    }

    const bookings = await Booking.find({
      $or: [
        { providerId: userId },
        { assignedProviderId: userId },
        { 'providerResponses.providerId': userId },
        unassignedFilter,
      ],
    })
      .populate('customerId', 'fullName phone email')
      .populate('serviceCategoryId')
      .populate('serviceId')
      .sort({ createdAt: -1 });

    // Exclude any requests that this provider has declined/rejected so they don't clutter the duty portal
    const activeBookings = bookings.filter((b: any) => {
      const myResp = b.providerResponses?.find(
        (r: any) => r.providerId?.toString() === userId.toString()
      );
      if (myResp && myResp.status === 'REJECTED') {
        return false;
      }
      if (b.status === 'REJECTED' && b.providerId?.toString() !== userId.toString()) {
        return false;
      }
      return true;
    });

    const bookingIds = activeBookings.map((b: any) => b._id);
    const settlements = await Settlement.find({ bookingId: { $in: bookingIds } }).lean();
    const settlementMap = new Map<string, any>();
    settlements.forEach((s) => settlementMap.set(s.bookingId.toString(), s));

    const payments = await Payment.find({ bookingId: { $in: bookingIds } }).lean();
    const paymentMap = new Map<string, any>();
    payments.forEach((p: any) => paymentMap.set(p.bookingId.toString(), p));

    const enrichedBookings = activeBookings.map((bDoc: any) => {
      const b = bDoc.toObject ? bDoc.toObject() : { ...bDoc };
      const s = settlementMap.get(b._id.toString());
      const p = paymentMap.get(b._id.toString());

      const grossAmount = b.pricing?.totalAmount || 0;
      const platformFee = s ? s.platformFee : Math.round(grossAmount * 0.2);
      const netEarning = s ? s.netEarning : (grossAmount - platformFee);

      const isCash = s
        ? (s.paymentMethod === 'CASH' || s.paymentMethod === 'CASH_OFFLINE' || (s.platformSettlementStatus && s.platformSettlementStatus !== 'NOT_APPLICABLE'))
        : (p?.paymentMethod === 'CASH' || p?.paymentMethod === 'CASH_OFFLINE' || b.paymentMethod === 'CASH');

      b.paymentMethod = s?.paymentMethod || p?.paymentMethod || (isCash ? 'CASH' : 'ONLINE');
      b.netEarning = netEarning;
      b.platformFee = platformFee;
      b.platformPayableAmount = s?.platformPayableAmount ?? (isCash ? platformFee : 0);
      b.platformSettlementStatus = s?.platformSettlementStatus ?? (isCash ? 'DUE' : 'NOT_APPLICABLE');
      return b;
    });

    return res.json({ success: true, count: enrichedBookings.length, bookings: enrichedBookings });
  } catch (error) {
    next(error);
  }
};

export const getClinicBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const bookings = await Booking.find({ clinicId: userId })
      .populate('customerId', 'fullName phone email')
      .populate('serviceCategoryId')
      .populate('serviceId')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

export const getLabBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const labCatDoc = await ServiceCategory.findOne({ slug: { $in: ['lab-test', 'lab-tests'] } }).lean();

    const labFilter: any = {
      $or: [
        { labId: userId },
        { 'providerResponses.providerId': userId },
      ],
    };

    // Include unassigned lab test requests
    if (labCatDoc) {
      labFilter.$or.push({
        labId: { $in: [null, undefined] },
        serviceCategoryId: labCatDoc._id,
        status: { $in: [BookingStatus.REQUESTED, BookingStatus.SEARCHING, BookingStatus.PENDING] },
        serviceMode: 'HOME_VISIT',
      });
    }

    const bookings = await Booking.find(labFilter)
      .populate('customerId', 'fullName phone email')
      .populate('serviceCategoryId')
      .populate('serviceId')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// Get Single Booking Details
export const getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const booking = await Booking.findById(id)
      .populate('customerId', 'fullName phone email')
      .populate('serviceCategoryId')
      .populate('serviceId')
      .populate('providerId', 'fullName photo qualification experienceYears verificationStatus')
      .populate('clinicId')
      .populate('labId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    const customerIdStr = ((booking.customerId as any)?._id || booking.customerId)?.toString();
    const isCustomer = customerIdStr === userId;
    const isProvider =
      (booking.providerId && (booking.providerId as any)._id?.toString() === userId) ||
      (booking.providerResponses && booking.providerResponses.some((r: any) => r.providerId.toString() === userId));
    const isClinic = booking.clinicId && (booking.clinicId as any)._id?.toString() === userId;
    const isLab = booking.labId && (booking.labId as any)._id?.toString() === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isCustomer && !isProvider && !isClinic && !isLab && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Ensure OTP exists for this booking so customer always has a valid start OTP
    if (!booking.serviceOtp) {
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      booking.serviceOtp = generatedOtp;
      booking.serviceOtpHash = generatedOtp;
      await Booking.findByIdAndUpdate(booking._id, { serviceOtp: generatedOtp, serviceOtpHash: generatedOtp });
    }

    // Do NOT expose OTP to provider/clinic/lab; only to customer/admin
    const bookingObj = booking.toObject();
    if (!isCustomer && !isAdmin) {
      delete (bookingObj as any).serviceOtp;
      delete (bookingObj as any).serviceOtpHash;
    }

    let childSessions: any[] = [];
    if (booking.isRecurringParent) {
      childSessions = await Booking.find({ parentBookingId: booking._id }).sort({ bookingDate: 1 });
    }

    return res.json({ success: true, booking: bookingObj, childSessions });
  } catch (error) {
    next(error);
  }
};

// Live Booking Status Query (For Real-Time Patient Status Dashboard)
export const getLiveBookingStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const booking = await Booking.findById(id)
      .populate('serviceId')
      .populate('serviceCategoryId')
      .populate('providerId', 'fullName photo phone qualification experienceYears verificationStatus');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    const isCustomer = booking.customerId.toString() === userId;
    const isProvider =
      (booking.providerId && (booking.providerId as any)._id?.toString() === userId) ||
      (booking.providerResponses && booking.providerResponses.some((r: any) => r.providerId.toString() === userId));
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const responses = booking.providerResponses || [];
    const acceptedCount = responses.filter((r: any) => r.status === 'ACCEPTED').length;
    const rejectedCount = responses.filter((r: any) => r.status === 'REJECTED').length;
    const waitingCount = responses.filter((r: any) => r.status === 'PENDING').length;

    const serviceOtp = isCustomer || isAdmin ? booking.serviceOtp : undefined;

    return res.json({
      success: true,
      booking: {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        serviceMode: booking.serviceMode,
        serviceId: booking.serviceId,
        serviceCategoryId: booking.serviceCategoryId,
        serviceAddress: booking.serviceAddress,
        bookingDate: booking.bookingDate,
        timeSlot: booking.timeSlot,
        pricing: booking.pricing,
        nearbyProviderCount: booking.nearbyProviderCount || responses.length,
        acceptedCount,
        rejectedCount,
        waitingCount,
        assignedProvider: booking.providerId,
        serviceOtp,
        serviceStartedAt: booking.serviceStartedAt,
        serviceCompletedAt: booking.serviceCompletedAt,
        paidAt: booking.paidAt,
        createdAt: booking.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Dedicated Action: ACCEPT BOOKING (Atomic Race-Condition Prevention)
export const acceptBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account not active or disabled' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: `Your provider account has been blocked by an administrator. Reason: ${user.blockedReason || 'Policy violation'}. You cannot accept booking requests.`,
      });
    }

    if (userRole !== UserRole.ADMIN && user.verificationStatus !== VerificationStatus.VERIFIED) {
      return res.status(403).json({ success: false, message: 'Your account must be VERIFIED by Admin before accepting requests.' });
    }

    // Generate ONE fixed 4-digit OTP for this booking
    const serviceOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // ATOMIC UPDATE: Ensures only ONE provider can accept
    const booking = await Booking.findOneAndUpdate(
      {
        _id: id,
        status: { $in: [BookingStatus.REQUESTED, BookingStatus.SEARCHING, BookingStatus.PENDING] },
        $or: [{ providerId: null }, { providerId: { $exists: false } }, { providerId: userId }, { 'providerResponses.providerId': userId }],
      },
      {
        $set: {
          status: BookingStatus.ACCEPTED,
          providerId: userId,
          assignedProviderId: userId,
          serviceOtp,
          serviceOtpHash: serviceOtp,
        },
      },
      { new: true }
    );

    if (!booking) {
      return res.status(409).json({
        success: false,
        message: 'Request is no longer available or has already been accepted by another provider.',
      });
    }

    if (booking.providerResponses && booking.providerResponses.length > 0) {
      booking.providerResponses.forEach((resp: any) => {
        if (resp.providerId.toString() === userId) {
          resp.status = 'ACCEPTED';
          resp.respondedAt = new Date();
        } else if (resp.status === 'PENDING') {
          resp.status = 'CANCELLED';
        }
      });
    } else {
      booking.providerResponses = [
        {
          providerId: userId as any,
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      ];
    }

    booking.statusHistory.push({
      status: BookingStatus.ACCEPTED,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: `Accepted by provider (${(user as any).fullName || user.email})`,
    });

    await booking.save();
    await booking.populate(['customerId', 'serviceCategoryId', 'serviceId']);

    await createNotification(
      booking.customerId,
      'Provider Accepted Your Request!',
      `A verified specialist has accepted your request #${booking.bookingNumber}. OTP: ${serviceOtp}`,
      'BOOKING_ACCEPTED',
      booking._id.toString()
    );

    return res.json({ success: true, message: 'Request accepted successfully', booking });
  } catch (error) {
    next(error);
  }
};

// Dedicated Action: REJECT BOOKING
export const rejectBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const userId = req.user!.id;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request record not found' });
    }

    let updated = false;
    if (booking.providerResponses && booking.providerResponses.length > 0) {
      booking.providerResponses.forEach((resp: any) => {
        if (resp.providerId.toString() === userId) {
          resp.status = 'REJECTED';
          resp.respondedAt = new Date();
          resp.rejectionReason = rejectionReason || 'Provider declined request';
          updated = true;
        }
      });
    }

    if (!updated) {
      if (!booking.providerResponses) {
        booking.providerResponses = [];
      }
      booking.providerResponses.push({
        providerId: userId as any,
        status: 'REJECTED',
        respondedAt: new Date(),
        rejectionReason: rejectionReason || 'Provider declined request',
      });
      updated = true;
    }

    // If this provider was previously assigned, unassign them so another provider can take it
    if (booking.providerId?.toString() === userId || booking.assignedProviderId?.toString() === userId) {
      booking.providerId = undefined;
      booking.assignedProviderId = undefined;
      booking.status = BookingStatus.REQUESTED;
    }

    // Check if ALL providers rejected
    const responses = booking.providerResponses || [];
    const allRejected =
      responses.length > 0 &&
      responses.every((r: any) => r.status === 'REJECTED' || r.status === 'CANCELLED');

    if (allRejected) {
      booking.status = BookingStatus.NO_PROVIDER_FOUND;
      booking.statusHistory.push({
        status: BookingStatus.NO_PROVIDER_FOUND,
        changedBy: userId as any,
        timestamp: new Date(),
        notes: 'All nearby providers declined the service request.',
      });
    }

    await booking.save();

    return res.json({ success: true, message: 'Request rejected', booking });
  } catch (error) {
    next(error);
  }
};

// Dedicated Action: START SERVICE (OTP Verification Required)
export const startBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    const isAssigned =
      userRole === UserRole.ADMIN ||
      (booking.providerId && booking.providerId.toString() === userId) ||
      (booking.assignedProviderId && booking.assignedProviderId.toString() === userId);

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (booking.status !== BookingStatus.ACCEPTED) {
      return res.status(400).json({
        success: false,
        message: `Cannot start service. Current status is '${booking.status}'. Required status: ACCEPTED.`,
      });
    }

    // Verify 4-digit OTP
    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp || (booking.serviceOtp && cleanOtp !== booking.serviceOtp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please enter the OTP shown to the patient.',
      });
    }

    booking.status = BookingStatus.IN_PROGRESS;
    booking.serviceStartedAt = new Date();
    booking.statusHistory.push({
      status: BookingStatus.IN_PROGRESS,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: 'Service session started after OTP verification',
    });

    await booking.save();

    await createNotification(
      booking.customerId,
      'Service In Progress',
      `Your healthcare service session #${booking.bookingNumber} is now IN PROGRESS.`,
      'BOOKING_STARTED',
      booking._id.toString()
    );

    return res.json({ success: true, message: 'Service started successfully', booking });
  } catch (error) {
    next(error);
  }
};

// Dedicated Action: COMPLETE SERVICE (Enforces Status Progression & Enables Payment)
export const completeBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    const isAssigned =
      userRole === UserRole.ADMIN ||
      (booking.providerId && booking.providerId.toString() === userId) ||
      (booking.assignedProviderId && booking.assignedProviderId.toString() === userId);

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete service before starting it. Current status is '${booking.status}'. Required status: IN_PROGRESS.`,
      });
    }

    if (booking.paymentStatus === 'PAID') {
      booking.status = BookingStatus.COMPLETED;
      booking.serviceCompletedAt = new Date();
      booking.statusHistory.push({
        status: BookingStatus.COMPLETED,
        changedBy: userId as any,
        timestamp: new Date(),
        notes: 'Service work completed by provider. Booking marked COMPLETED as payment was already fulfilled.',
      });

      await booking.save();
      await createEarningLedgerRecord(booking._id.toString());

      await createNotification(
        booking.customerId,
        'Service Completed',
        `Your healthcare service session #${booking.bookingNumber} was completed successfully. Thank you!`,
        'BOOKING_COMPLETED',
        booking._id.toString()
      );

      return res.json({ success: true, message: 'Service marked as completed.', booking });
    } else {
      booking.status = BookingStatus.PAYMENT_PENDING;
      booking.paymentStatus = 'PENDING';
      booking.serviceCompletedAt = new Date();
      booking.statusHistory.push({
        status: BookingStatus.PAYMENT_PENDING,
        changedBy: userId as any,
        timestamp: new Date(),
        notes: 'Service work completed by provider. Post-service payment is now due.',
      });

      await booking.save();

      await createNotification(
        booking.customerId,
        'Service Completed - Payment Due',
        `Your healthcare service session #${booking.bookingNumber} was completed. Total Due: ₹${booking.pricing.totalAmount}. Please complete payment now.`,
        'BOOKING_COMPLETED',
        booking._id.toString()
      );

      return res.json({ success: true, message: 'Service marked as completed. Payment is now due.', booking });
    }
  } catch (error) {
    next(error);
  }
};

// Generic Update Booking Status
export const updateBookingStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    const isAuthorized =
      userRole === UserRole.ADMIN ||
      booking.customerId.toString() === userId ||
      (booking.providerId && booking.providerId.toString() === userId) ||
      (booking.clinicId && booking.clinicId.toString() === userId) ||
      (booking.labId && booking.labId.toString() === userId) ||
      booking.createdById.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const currentStatus = booking.status;
    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (userRole !== UserRole.ADMIN && !allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${currentStatus}' to '${status}'.`,
      });
    }

    booking.status = status;
    booking.statusHistory.push({
      status,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: notes || `Status updated to ${status}`,
    });

    await booking.save();
    return res.json({ success: true, message: `Booking status updated to ${status}`, booking });
  } catch (error) {
    next(error);
  }
};

// Cancel Booking
export const cancelBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    const isAuthorized =
      userRole === UserRole.ADMIN ||
      booking.customerId.toString() === userId ||
      (booking.providerId && booking.providerId.toString() === userId);

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.PAID) {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed/paid booking.' });
    }

    booking.status = BookingStatus.CANCELLED;
    booking.statusHistory.push({
      status: BookingStatus.CANCELLED,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: `Cancelled. Reason: ${cancellationReason || 'User requested cancellation'}`,
    });

    await booking.save();

    return res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (error) {
    next(error);
  }
};

// Helper: Calculate IST Date Boundaries
const getISTDates = () => {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  
  // Yesterday
  const y = new Date(now.getTime() - 86400000);
  const yesterdayStr = y.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Parse today YYYY-MM-DD
  const [year, month, day] = todayStr.split('-').map(Number);

  // IST Date object at 12:00 UTC to prevent date boundary shifts
  const istTodayObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = istTodayObj.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // This Week Mon & Sun
  const monObj = new Date(istTodayObj.getTime() - diffToMon * 86400000);
  const thisWeekStartStr = monObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  
  const sunObj = new Date(monObj.getTime() + 6 * 86400000);
  const thisWeekEndStr = sunObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Last Week Mon & Sun
  const lastMonObj = new Date(monObj.getTime() - 7 * 86400000);
  const lastSunObj = new Date(sunObj.getTime() - 7 * 86400000);
  const lastWeekStartStr = lastMonObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const lastWeekEndStr = lastSunObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // This Month Start & End
  const thisMonthStartStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDayOfThisMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
  const thisMonthEndStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfThisMonth).padStart(2, '0')}`;

  // Last Month Start & End
  const lastMonthYear = month === 1 ? year - 1 : year;
  const lastMonthNum = month === 1 ? 12 : month - 1;
  const lastMonthStartStr = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}-01`;
  const lastDayOfLastMonth = new Date(Date.UTC(lastMonthYear, lastMonthNum, 0, 12, 0, 0)).getUTCDate();
  const lastMonthEndStr = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}-${String(lastDayOfLastMonth).padStart(2, '0')}`;

  return {
    todayStr,
    yesterdayStr,
    thisWeekStartStr,
    thisWeekEndStr,
    lastWeekStartStr,
    lastWeekEndStr,
    thisMonthStartStr,
    thisMonthEndStr,
    lastMonthStartStr,
    lastMonthEndStr,
  };
};

// Provider Earnings & Booking Analytics Controller
export const getProviderAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // Authenticated Provider User ID (IDOR Protected!)

    // Query parameters
    const { date, range, fromDate, toDate } = req.query;

    const dates = getISTDates();

    // Query provider's assigned or accepted bookings
    const bookings = await Booking.find({
      $or: [
        { providerId: userId },
        { assignedProviderId: userId },
      ],
    })
      .populate('serviceId', 'name')
      .populate('customerId', 'fullName phone email')
      .sort({ bookingDate: -1, createdAt: -1 })
      .lean();

    const bookingIds = bookings.map((b: any) => b._id);

    // Fetch existing Settlement entries for this provider and their bookings
    const settlements = await Settlement.find({
      $or: [
        { entityUserId: userId },
        { bookingId: { $in: bookingIds } },
      ],
    }).lean();
    const settlementMap = new Map<string, any>();
    settlements.forEach((s) => {
      settlementMap.set(s.bookingId.toString(), s);
    });

    // Fetch existing Payment entries for cash / method verification
    const payments = await Payment.find({ bookingId: { $in: bookingIds } }).lean();
    const paymentMap = new Map<string, any>();
    payments.forEach((p: any) => {
      paymentMap.set(p.bookingId.toString(), p);
    });

    // Helper: Calculate gross, platform fee & net earning for a booking
    const getBookingEarningDetails = (b: any) => {
      const grossAmount = b.pricing?.totalAmount || 0;
      const settlement = settlementMap.get(b._id.toString());
      const payment = paymentMap.get(b._id.toString());
      
      const platformFee = settlement ? settlement.platformFee : Math.round(grossAmount * 0.2);
      const netEarning = settlement ? settlement.netEarning : (grossAmount - platformFee);

      // Earning eligibility check: Must be COMPLETED or PAID, and paymentStatus must be PAID
      const isEligible = (b.status === BookingStatus.COMPLETED || b.status === BookingStatus.PAID) && 
                         (b.paymentStatus === PaymentStatus.PAID || b.status === BookingStatus.PAID);

      const isCash = settlement
        ? (settlement.paymentMethod === 'CASH' || settlement.paymentMethod === 'CASH_OFFLINE' || (settlement.platformSettlementStatus && settlement.platformSettlementStatus !== 'NOT_APPLICABLE'))
        : (payment?.paymentMethod === 'CASH' || payment?.paymentMethod === 'CASH_OFFLINE' || b.paymentMethod === 'CASH');

      const cashCollected = (isEligible && isCash) ? grossAmount : 0;
      const platformPayable = (isEligible && isCash) ? platformFee : 0;
      const platformStatus = settlement?.platformSettlementStatus || (isEligible && isCash ? 'DUE' : 'NOT_APPLICABLE');

      return {
        grossAmount,
        platformFee,
        netEarning: isEligible ? netEarning : 0,
        isEligible,
        isCash,
        cashCollected,
        platformPayable,
        platformStatus,
      };
    };

    // Overall KPI Summary
    let totalEarnings = 0;
    let todayEarnings = 0;
    let thisWeekEarnings = 0;
    let thisMonthEarnings = 0;

    let totalBookings = bookings.length;
    let todayBookings = 0;
    let thisWeekBookings = 0;
    let thisMonthBookings = 0;

    let completedBookingsCount = 0;
    let cancelledBookingsCount = 0;

    let totalCashCollected = 0;
    let totalPlatformAmountDue = 0;
    let totalPlatformAmountPaid = 0;
    let cashBookingsCount = 0;

    bookings.forEach((b: any) => {
      const { netEarning, isEligible, isCash, cashCollected, platformPayable, platformStatus } = getBookingEarningDetails(b);
      const bDate = b.bookingDate;

      const isCompleted = b.status === BookingStatus.COMPLETED || b.status === BookingStatus.PAID;
      const isCancelled = b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED;

      if (isCompleted && isEligible) {
        completedBookingsCount++;
        totalEarnings += netEarning;
        if (isCash) {
          cashBookingsCount++;
          totalCashCollected += cashCollected;
          if (platformStatus === 'DUE') {
            totalPlatformAmountDue += platformPayable;
          } else if (platformStatus === 'PAID' || platformStatus === 'VERIFIED' || platformStatus === 'SUBMITTED') {
            totalPlatformAmountPaid += platformPayable;
          }
        }
      }
      if (isCancelled) {
        cancelledBookingsCount++;
      }

      // Today KPI
      if (bDate === dates.todayStr) {
        todayBookings++;
        if (isEligible) todayEarnings += netEarning;
      }

      // This Week KPI
      if (bDate >= dates.thisWeekStartStr && bDate <= dates.thisWeekEndStr) {
        thisWeekBookings++;
        if (isEligible) thisWeekEarnings += netEarning;
      }

      // This Month KPI
      if (bDate >= dates.thisMonthStartStr && bDate <= dates.thisMonthEndStr) {
        thisMonthBookings++;
        if (isEligible) thisMonthEarnings += netEarning;
      }
    });

    // Resolve Requested Range Filter
    let filterStart = dates.todayStr;
    let filterEnd = dates.todayStr;
    let filterLabel = 'Today';

    const rangeType = String(range || '').toLowerCase();

    if (date && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      filterStart = date;
      filterEnd = date;
      filterLabel = date;
    } else if (rangeType === 'today') {
      filterStart = dates.todayStr;
      filterEnd = dates.todayStr;
      filterLabel = 'Today';
    } else if (rangeType === 'yesterday') {
      filterStart = dates.yesterdayStr;
      filterEnd = dates.yesterdayStr;
      filterLabel = 'Yesterday';
    } else if (rangeType === 'this_week') {
      filterStart = dates.thisWeekStartStr;
      filterEnd = dates.thisWeekEndStr;
      filterLabel = 'This Week';
    } else if (rangeType === 'last_week') {
      filterStart = dates.lastWeekStartStr;
      filterEnd = dates.lastWeekEndStr;
      filterLabel = 'Last Week';
    } else if (rangeType === 'this_month') {
      filterStart = dates.thisMonthStartStr;
      filterEnd = dates.thisMonthEndStr;
      filterLabel = 'This Month';
    } else if (rangeType === 'last_month') {
      filterStart = dates.lastMonthStartStr;
      filterEnd = dates.lastMonthEndStr;
      filterLabel = 'Last Month';
    } else if (rangeType === 'custom' && fromDate && toDate) {
      filterStart = String(fromDate);
      filterEnd = String(toDate);
      filterLabel = `${fromDate} to ${toDate}`;
    }

    // Filter Bookings for Selected Range
    const filteredBookings = bookings.filter((b: any) => b.bookingDate >= filterStart && b.bookingDate <= filterEnd);

    let rangeTotalBookings = filteredBookings.length;
    let rangeCompletedBookings = 0;
    let rangeCancelledBookings = 0;
    let rangeTotalEarnings = 0;
    let rangeTotalGross = 0;
    let rangeTotalPlatformFee = 0;
    let rangeTotalCashCollected = 0;
    let rangePlatformFeeDue = 0;

    const filteredBookingsDetails = filteredBookings.map((b: any) => {
      const { grossAmount, platformFee, netEarning, isEligible, isCash, cashCollected, platformPayable, platformStatus } = getBookingEarningDetails(b);

      const isCompleted = b.status === BookingStatus.COMPLETED || b.status === BookingStatus.PAID;
      const isCancelled = b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED;

      if (isCompleted && isEligible) {
        rangeCompletedBookings++;
        rangeTotalEarnings += netEarning;
        rangeTotalGross += grossAmount;
        rangeTotalPlatformFee += platformFee;
        if (isCash) {
          rangeTotalCashCollected += cashCollected;
          if (platformStatus === 'DUE') {
            rangePlatformFeeDue += platformPayable;
          }
        }
      }
      if (isCancelled) {
        rangeCancelledBookings++;
      }

      // Mask customer phone for privacy (e.g. 8120***578)
      const rawPhone = b.customerDetails?.phone || '';
      const maskedPhone = rawPhone.length >= 10 
        ? `${rawPhone.slice(0, 4)}***${rawPhone.slice(-3)}`
        : rawPhone;

      return {
        _id: b._id,
        bookingNumber: b.bookingNumber,
        serviceName: b.serviceId?.name || 'Healthcare Service',
        customerName: b.customerDetails?.name || 'Customer',
        customerPhone: maskedPhone,
        bookingDate: b.bookingDate,
        timeSlot: b.timeSlot,
        status: b.status,
        paymentStatus: b.paymentStatus || 'PENDING',
        grossAmount,
        platformFee,
        netEarning: isEligible ? netEarning : 0,
        isEligible,
        isCash,
        cashCollected,
        platformPayableAmount: platformPayable,
        platformSettlementStatus: platformStatus,
      };
    });

    // Build Weekly Day-by-Day Breakdown (Current Week Mon-Sun)
    const daysOfWeekNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [wYear, wMonth, wDay] = dates.thisWeekStartStr.split('-').map(Number);
    const monDateObj = new Date(Date.UTC(wYear, wMonth - 1, wDay, 12, 0, 0));

    const weeklyBreakdown = daysOfWeekNames.map((dayName, idx) => {
      const dayObj = new Date(monDateObj.getTime() + idx * 86400000);
      const dayStr = dayObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      const dayBookings = bookings.filter((b: any) => b.bookingDate === dayStr);
      let dayCompleted = 0;
      let dayEarnings = 0;

      dayBookings.forEach((b: any) => {
        const { netEarning, isEligible } = getBookingEarningDetails(b);
        if ((b.status === BookingStatus.COMPLETED || b.status === BookingStatus.PAID) && isEligible) {
          dayCompleted++;
          dayEarnings += netEarning;
        }
      });

      return {
        day: dayName,
        date: dayStr,
        bookings: dayBookings.length,
        completed: dayCompleted,
        earnings: dayEarnings,
      };
    });

    // Build Monthly Day-by-Day Breakdown (Current Month 1st to last day)
    const [mYear, mMonth] = dates.thisMonthStartStr.split('-').map(Number);
    const lastDayOfMonth = new Date(Date.UTC(mYear, mMonth, 0, 12, 0, 0)).getUTCDate();
    const monthlyBreakdown = [];

    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthAbbr = monthNamesShort[mMonth - 1];

    for (let d = 1; d <= lastDayOfMonth; d++) {
      const dateStr = `${mYear}-${String(mMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayBookings = bookings.filter((b: any) => b.bookingDate === dateStr);
      let dayCompleted = 0;
      let dayEarnings = 0;

      dayBookings.forEach((b: any) => {
        const { netEarning, isEligible } = getBookingEarningDetails(b);
        if ((b.status === BookingStatus.COMPLETED || b.status === BookingStatus.PAID) && isEligible) {
          dayCompleted++;
          dayEarnings += netEarning;
        }
      });

      monthlyBreakdown.push({
        date: dateStr,
        label: `${currentMonthAbbr} ${d}`,
        bookings: dayBookings.length,
        completed: dayCompleted,
        earnings: dayEarnings,
      });
    }

    return res.json({
      success: true,
      summary: {
        totalEarnings,
        todayEarnings,
        thisWeekEarnings,
        thisMonthEarnings,
        totalBookings,
        todayBookings,
        thisWeekBookings,
        thisMonthBookings,
        completedBookingsCount,
        cancelledBookingsCount,
        totalCashCollected,
        totalPlatformAmountDue,
        platformAmountDue: totalPlatformAmountDue,
        totalPlatformAmountPaid,
        cashBookingsCount,
      },
      filteredAnalytics: {
        filterLabel,
        filterStart,
        filterEnd,
        totalBookings: rangeTotalBookings,
        completedBookings: rangeCompletedBookings,
        cancelledBookings: rangeCancelledBookings,
        totalEarnings: rangeTotalEarnings,
        totalGross: rangeTotalGross,
        totalPlatformFee: rangeTotalPlatformFee,
        totalCashCollected: rangeTotalCashCollected,
        platformFeeDue: rangePlatformFeeDue,
        bookingsList: filteredBookingsDetails,
      },
      weeklyBreakdown,
      monthlyBreakdown,
      todayEarnings,
      completedCount: rangeCompletedBookings || completedBookingsCount,
      platformAmountDue: totalPlatformAmountDue,
      totalPlatformAmountDue,
      totalEarnings,
    });
  } catch (error) {
    next(error);
  }
};
