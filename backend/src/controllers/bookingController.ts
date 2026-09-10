import { Response, NextFunction } from 'express';
import Booking, { PlanStatus } from '../models/Booking';
import Service from '../models/Service';
import CustomerProfile from '../models/CustomerProfile';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth';
import { BookingSource, BookingStatus, UserRole, VerificationStatus } from '../constants/enums';
import { generateRecurringSessions } from '../services/recurringEngine';
import { createNotification } from '../services/notificationService';
import { createEarningLedgerRecord } from './settlementController';

const generateBookingNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `CP-${dateStr}-${random4}`;
};

// State transition validation matrix
const ALLOWED_TRANSITIONS: { [key in BookingStatus]?: BookingStatus[] } = {
  [BookingStatus.PENDING]: [BookingStatus.ACCEPTED, BookingStatus.REJECTED, BookingStatus.CANCELLED],
  [BookingStatus.ACCEPTED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.REJECTED]: [],
  [BookingStatus.COMPLETED]: [],
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

// Create Online Booking (Customer)
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

    // Verify that target provider, clinic, or lab is VERIFIED and active
    const targetEntityUserId = providerId || clinicId || labId;
    if (targetEntityUserId) {
      const targetUser = await User.findById(targetEntityUserId);
      if (!targetUser || targetUser.verificationStatus !== VerificationStatus.VERIFIED || !targetUser.isActive) {
        return res.status(400).json({
          success: false,
          message: 'The selected provider, clinic, or lab is not verified or is inactive/suspended.',
        });
      }
    }

    const customerUser = await User.findById(customerId);
    const customerProfile = await CustomerProfile.findOne({ userId: customerId });

    let homeFee = 0;
    if (serviceMode === 'HOME_VISIT' || serviceMode === 'LAB_VISIT') {
      homeFee = labId ? 150 : 0;
    }

    const totalAmount = targetService.basePrice + homeFee;
    const isRecurring = engagementType === 'REGULAR_RECURRING';

    // SERVER-SIDE CONFLICT CHECK (For One-Time bookings)
    if (!isRecurring) {
      const conflict = await checkSlotConflict({ providerId, clinicId, labId }, bookingDate, timeSlot.startTime);
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Slot conflict: The requested time slot ${timeSlot.startTime} on ${bookingDate} is already booked. Please select another slot.`,
        });
      }
    }

    // 1. Create Main Booking
    const booking = await Booking.create({
      bookingNumber: generateBookingNumber(),
      bookingSource: BookingSource.ONLINE,
      createdById: customerId,
      customerId,
      customerDetails: {
        name: customerProfile?.fullName || 'Customer',
        phone: customerUser?.phone || '',
        email: customerUser?.email,
      },
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
        homeCollectionFee: homeFee,
        discountFee: 0,
        totalAmount,
      },
      status: BookingStatus.PENDING,
      statusHistory: [
        {
          status: BookingStatus.PENDING,
          changedBy: customerId as any,
          timestamp: new Date(),
          notes: isRecurring ? 'Recurring Parent Hiring Plan created' : 'Booking created online by customer',
        },
      ],
      notes,
    });

    // 2. Generate Session Instances if Recurring Plan
    let sessionEngineResult = null;
    if (isRecurring) {
      sessionEngineResult = await generateRecurringSessions({
        parentBooking: booking,
        durationWeeks: recurringConfig?.durationWeeks || 2,
      });
    }

    // 3. Send Notification to assigned Provider, Clinic, or Lab
    const recipientId = providerId || clinicId || labId;
    if (recipientId) {
      await createNotification(
        recipientId,
        'New Booking Request Received',
        `You have received a new ${booking.serviceMode.replace('_', ' ')} request #${booking.bookingNumber} for ${targetService.name} on ${bookingDate}.`,
        'BOOKING_CREATED',
        booking._id.toString()
      );
    }

    return res.status(201).json({
      success: true,
      message: isRecurring
        ? `Personal/Regular Hiring Plan created successfully. Generated ${sessionEngineResult?.totalGenerated} recurring sessions.`
        : 'Booking request created successfully',
      booking,
      recurringSessionsInfo: sessionEngineResult,
    });
  } catch (error) {
    next(error);
  }
};

// Create Manual Booking (Admin, Clinic Staff, Provider)
export const createManualBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const operatorId = req.user!.id;
    const {
      customerPhone,
      customerName,
      customerEmail,
      existingCustomerId,
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
      customPrice,
      notes,
    } = req.body;

    let targetCustomerId = existingCustomerId;

    if (!targetCustomerId) {
      let customerUser = await User.findOne({ phone: customerPhone });
      if (!customerUser) {
        const tempEmail = customerEmail || `guest_${Date.now()}@carepulse.local`;
        customerUser = await User.create({
          email: tempEmail,
          phone: customerPhone,
          role: UserRole.CUSTOMER,
          isGuest: true,
        });

        await CustomerProfile.create({
          userId: customerUser._id,
          fullName: customerName,
          addresses: serviceAddress ? [serviceAddress] : [],
        });
      }
      targetCustomerId = customerUser._id.toString();
    }

    const targetService = await Service.findById(serviceId);
    const baseFee = customPrice !== undefined ? customPrice : targetService?.basePrice || 0;
    const isRecurring = engagementType === 'REGULAR_RECURRING';

    if (!isRecurring) {
      const conflict = await checkSlotConflict({ providerId, clinicId, labId }, bookingDate, timeSlot.startTime);
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Slot conflict: Time slot ${timeSlot.startTime} on ${bookingDate} is already booked.`,
        });
      }
    }

    const booking = await Booking.create({
      bookingNumber: generateBookingNumber(),
      bookingSource: BookingSource.MANUAL,
      createdById: operatorId,
      customerId: targetCustomerId,
      customerDetails: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
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
        baseFee,
        homeCollectionFee: 0,
        discountFee: 0,
        totalAmount: baseFee,
      },
      status: BookingStatus.ACCEPTED,
      statusHistory: [
        {
          status: BookingStatus.ACCEPTED,
          changedBy: operatorId as any,
          timestamp: new Date(),
          notes: isRecurring ? 'Manual Recurring Plan created by staff' : 'Manual booking created by staff/operator',
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

    // Send Notification to Customer
    await createNotification(
      targetCustomerId,
      'Manual Appointment Scheduled',
      `An appointment #${booking.bookingNumber} has been scheduled for you on ${bookingDate} at ${timeSlot.startTime}.`,
      'BOOKING_CREATED',
      booking._id.toString()
    );

    return res.status(201).json({
      success: true,
      message: isRecurring
        ? `Manual Recurring Plan created. ${sessionEngineResult?.totalGenerated} sessions scheduled.`
        : 'Manual booking created successfully',
      booking,
      recurringSessionsInfo: sessionEngineResult,
    });
  } catch (error) {
    next(error);
  }
};

// Strict Role-Based Query: Provider Bookings
export const getProviderBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { status, date } = req.query;

    const filter: any = { providerId: userId };
    if (status) filter.status = status;
    if (date) filter.bookingDate = date;

    const bookings = await Booking.find(filter)
      .populate('serviceCategoryId')
      .populate('serviceId')
      .populate('customerId', 'email phone')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// Strict Role-Based Query: Clinic Bookings
export const getClinicBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { status, date } = req.query;

    const filter: any = { clinicId: userId };
    if (status) filter.status = status;
    if (date) filter.bookingDate = date;

    const bookings = await Booking.find(filter)
      .populate('serviceCategoryId')
      .populate('serviceId')
      .populate('customerId', 'email phone')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// Strict Role-Based Query: Lab Bookings
export const getLabBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { status, date } = req.query;

    const filter: any = { labId: userId };
    if (status) filter.status = status;
    if (date) filter.bookingDate = date;

    const bookings = await Booking.find(filter)
      .populate('serviceCategoryId')
      .populate('serviceId')
      .populate('customerId', 'email phone')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// Get My Bookings (Role Enforced)
export const getMyBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { status, bookingSource, serviceMode, date, isRecurringParent, parentBookingId } = req.query;

    const filter: any = {};

    if (role === UserRole.CUSTOMER) {
      filter.customerId = userId;
    } else if (role === UserRole.PROVIDER) {
      filter.providerId = userId;
    } else if (role === UserRole.CLINIC) {
      filter.clinicId = userId;
    } else if (role === UserRole.LAB) {
      filter.labId = userId;
    }

    if (status) filter.status = status;
    if (bookingSource) filter.bookingSource = bookingSource;
    if (serviceMode) filter.serviceMode = serviceMode;
    if (date) filter.bookingDate = date;
    if (isRecurringParent !== undefined) filter.isRecurringParent = isRecurringParent === 'true';
    if (parentBookingId) filter.parentBookingId = parentBookingId;

    const bookings = await Booking.find(filter)
      .populate('serviceCategoryId')
      .populate('serviceId')
      .populate('providerId', 'email phone')
      .populate('clinicId', 'email phone')
      .populate('labId', 'email phone')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

// Get Single Booking by ID with Strict IDOR Ownership Check
export const getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const booking = await Booking.findById(id)
      .populate('serviceCategoryId')
      .populate('serviceId')
      .populate('providerId')
      .populate('clinicId')
      .populate('labId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    // STRICT IDOR OWNERSHIP CHECK
    const isOwner =
      userRole === UserRole.ADMIN ||
      booking.customerId.toString() === userId ||
      (booking.providerId && booking.providerId._id.toString() === userId) ||
      (booking.clinicId && booking.clinicId._id.toString() === userId) ||
      (booking.labId && booking.labId._id.toString() === userId) ||
      booking.createdById.toString() === userId;

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not authorized to view this booking.' });
    }

    let childSessions: any[] = [];
    if (booking.isRecurringParent) {
      childSessions = await Booking.find({ parentBookingId: booking._id }).sort({ bookingDate: 1 });
    }

    return res.json({ success: true, booking, childSessions });
  } catch (error) {
    next(error);
  }
};

// Dedicated Action: ACCEPT BOOKING
export const acceptBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account not active or disabled' });
    }

    // Enforce Verification Check for Providers, Clinics, Labs
    if (userRole !== UserRole.ADMIN && user.verificationStatus !== VerificationStatus.VERIFIED) {
      return res.status(403).json({ success: false, message: 'Your account must be VERIFIED by Admin before accepting bookings.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    // OWNERSHIP CHECK
    const isAssigned =
      userRole === UserRole.ADMIN ||
      (booking.providerId && booking.providerId.toString() === userId) ||
      (booking.clinicId && booking.clinicId.toString() === userId) ||
      (booking.labId && booking.labId.toString() === userId);

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied. This booking is not assigned to your account.' });
    }

    if (booking.status !== BookingStatus.PENDING) {
      return res.status(400).json({ success: false, message: `Booking status is '${booking.status}'. Only PENDING bookings can be accepted.` });
    }

    // SLOT CONFLICT CHECK
    const conflict = await checkSlotConflict(
      { providerId: booking.providerId, clinicId: booking.clinicId, labId: booking.labId },
      booking.bookingDate,
      booking.timeSlot.startTime,
      booking._id.toString()
    );

    if (conflict && conflict.status === BookingStatus.ACCEPTED) {
      return res.status(409).json({ success: false, message: 'Slot conflict: An accepted booking already exists for this time slot.' });
    }

    booking.status = BookingStatus.ACCEPTED;
    booking.statusHistory.push({
      status: BookingStatus.ACCEPTED,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: 'Booking accepted by provider/clinic/lab',
    });

    await booking.save();

    // NOTIFY CUSTOMER
    await createNotification(
      booking.customerId,
      'Booking Request Accepted',
      `Your booking request #${booking.bookingNumber} for ${booking.bookingDate} has been ACCEPTED.`,
      'BOOKING_ACCEPTED',
      booking._id.toString()
    );

    return res.json({ success: true, message: 'Booking accepted successfully', booking });
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
    const userRole = req.user!.role;

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    const isAssigned =
      userRole === UserRole.ADMIN ||
      (booking.providerId && booking.providerId.toString() === userId) ||
      (booking.clinicId && booking.clinicId.toString() === userId) ||
      (booking.labId && booking.labId.toString() === userId);

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied. You cannot reject this booking.' });
    }

    if (booking.status !== BookingStatus.PENDING) {
      return res.status(400).json({ success: false, message: `Booking status is '${booking.status}'. Only PENDING bookings can be rejected.` });
    }

    booking.status = BookingStatus.REJECTED;
    booking.notes = `Rejected reason: ${rejectionReason}`;
    booking.statusHistory.push({
      status: BookingStatus.REJECTED,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: `Rejected: ${rejectionReason}`,
    });

    await booking.save();

    // NOTIFY CUSTOMER
    await createNotification(
      booking.customerId,
      'Booking Request Rejected',
      `Your booking request #${booking.bookingNumber} was rejected. Reason: ${rejectionReason}`,
      'BOOKING_REJECTED',
      booking._id.toString()
    );

    return res.json({ success: true, message: 'Booking rejected successfully', booking });
  } catch (error) {
    next(error);
  }
};

// Dedicated Action: START SERVICE
export const startBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
      (booking.clinicId && booking.clinicId.toString() === userId) ||
      (booking.labId && booking.labId.toString() === userId);

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (booking.status !== BookingStatus.ACCEPTED) {
      return res.status(400).json({ success: false, message: `Cannot start service. Booking status is '${booking.status}'. Required status: ACCEPTED.` });
    }

    booking.status = BookingStatus.IN_PROGRESS;
    booking.statusHistory.push({
      status: BookingStatus.IN_PROGRESS,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: 'Service session started',
    });

    await booking.save();

    // NOTIFY CUSTOMER
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

// Dedicated Action: COMPLETE SERVICE
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
      (booking.clinicId && booking.clinicId.toString() === userId) ||
      (booking.labId && booking.labId.toString() === userId);

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      return res.status(400).json({ success: false, message: `Cannot complete service. Booking status is '${booking.status}'. Required status: IN_PROGRESS.` });
    }

    booking.status = BookingStatus.COMPLETED;
    booking.statusHistory.push({
      status: BookingStatus.COMPLETED,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: 'Service session marked as completed',
    });

    await booking.save();

    // GENERATE PROVIDER / CLINIC / LAB EARNING LEDGER RECORD
    await createEarningLedgerRecord(booking._id.toString());

    // NOTIFY CUSTOMER
    await createNotification(
      booking.customerId,
      'Service Completed',
      `Your healthcare service session #${booking.bookingNumber} has been COMPLETED.`,
      'BOOKING_COMPLETED',
      booking._id.toString()
    );

    return res.json({ success: true, message: 'Service marked as completed successfully', booking });
  } catch (error) {
    next(error);
  }
};

// Generic Update Booking Status (State Machine Enforced)
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
      return res.status(403).json({ success: false, message: 'Access denied. You cannot modify this booking.' });
    }

    const currentStatus = booking.status;
    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(status as BookingStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${currentStatus}' to '${status}'. Allowed transitions: [${allowedNextStatuses.join(', ')}]`,
      });
    }

    booking.status = status as BookingStatus;
    booking.statusHistory.push({
      status: status as BookingStatus,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: notes || `Status changed to ${status}`,
    });

    await booking.save();

    return res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// Dedicated Action: CANCEL BOOKING
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
      (booking.providerId && booking.providerId.toString() === userId) ||
      (booking.clinicId && booking.clinicId.toString() === userId) ||
      (booking.labId && booking.labId.toString() === userId) ||
      booking.createdById.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access denied. You cannot cancel this booking.' });
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.REJECTED) {
      return res.status(400).json({ success: false, message: `Booking is already in '${booking.status}' status and cannot be cancelled.` });
    }

    booking.status = BookingStatus.CANCELLED;
    const reasonText = cancellationReason ? `Cancelled: ${cancellationReason}` : 'Booking cancelled by user';
    booking.notes = booking.notes ? `${booking.notes} | ${reasonText}` : reasonText;

    booking.statusHistory.push({
      status: BookingStatus.CANCELLED,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: reasonText,
    });

    await booking.save();

    // NOTIFY STAKEHOLDERS
    const recipientId = userRole === UserRole.CUSTOMER
      ? (booking.providerId || booking.clinicId || booking.labId)
      : booking.customerId;

    if (recipientId) {
      await createNotification(
        recipientId,
        'Booking Cancelled',
        `Booking #${booking.bookingNumber} has been CANCELLED. Reason: ${cancellationReason || 'No reason provided'}`,
        'BOOKING_CANCELLED',
        booking._id.toString()
      );
    }

    return res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (error) {
    next(error);
  }
};

