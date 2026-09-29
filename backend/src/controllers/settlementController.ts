import { Response, NextFunction } from 'express';
import Settlement from '../models/Settlement';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import { AuthRequest } from '../middlewares/auth';
import { UserRole, SettlementStatus, PaymentStatus, PaymentMethod, PlatformSettlementStatus, BookingStatus } from '../constants/enums';

// Helper: Generate Earning Ledger Entry when Booking is COMPLETED
export const createEarningLedgerRecord = async (bookingId: string) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return null;

    const entityUserId = booking.providerId || booking.assignedProviderId || booking.clinicId || booking.labId;
    if (!entityUserId) return null;

    let entityRole = UserRole.PROVIDER;
    if (booking.clinicId) entityRole = UserRole.CLINIC;
    else if (booking.labId) entityRole = UserRole.LAB;

    const payment = await Payment.findOne({ bookingId: booking._id });
    const grossAmount = booking.pricing.totalAmount;
    const platformFee = Math.round(grossAmount * 0.2); // 20% platform commission fee (80% net earnings for provider)
    const taxAmount = 0;
    const netEarning = grossAmount - platformFee - taxAmount;

    const isCash = payment ? (payment.paymentMethod === PaymentMethod.CASH || payment.paymentMethod === PaymentMethod.CASH_OFFLINE) : false;

    const cashCollectedByProvider = isCash ? grossAmount : 0;
    const platformPayableAmount = isCash ? platformFee : 0;
    const platformSettlementStatus = isCash ? PlatformSettlementStatus.DUE : PlatformSettlementStatus.NOT_APPLICABLE;

    const settlementId = `STL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const existing = await Settlement.findOne({ bookingId: booking._id });
    if (existing) {
      if (isCash && (existing.platformSettlementStatus === PlatformSettlementStatus.NOT_APPLICABLE || !existing.platformSettlementStatus)) {
        existing.paymentMethod = payment ? payment.paymentMethod : PaymentMethod.CASH;
        existing.cashCollectedByProvider = grossAmount;
        existing.platformPayableAmount = platformFee;
        existing.platformSettlementStatus = PlatformSettlementStatus.DUE;
        await existing.save();
      }
      return existing;
    }

    const record = await Settlement.create({
      settlementId,
      bookingId: booking._id,
      paymentId: payment ? payment._id : booking._id,
      entityRole,
      entityUserId,
      grossAmount,
      platformFee,
      taxAmount,
      netEarning,
      paymentMethod: payment ? payment.paymentMethod : (isCash ? PaymentMethod.CASH : PaymentMethod.RAZORPAY),
      cashCollectedByProvider,
      platformPayableAmount,
      platformSettlementStatus,
      status: SettlementStatus.PENDING,
    });

    return record;
  } catch (error) {
    console.error('Failed to generate earning ledger record', error);
    return null;
  }
};

// 1. Get Provider / Clinic / Lab Own Earnings Dashboard
export const getMyEarnings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entityUserId = req.user!.id;
    const role = req.user!.role;

    if (role !== UserRole.PROVIDER && role !== UserRole.CLINIC && role !== UserRole.LAB && role !== UserRole.ADMIN) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const filter: any = { entityUserId };
    const settlements = await Settlement.find(filter)
      .populate({
        path: 'bookingId',
        populate: { path: 'serviceId' },
      })
      .sort({ createdAt: -1 });

    const totalGross = settlements.reduce((acc, s) => acc + s.grossAmount, 0);
    const totalPlatformFee = settlements.reduce((acc, s) => acc + s.platformFee, 0);
    const totalNetEarnings = settlements.reduce((acc, s) => acc + s.netEarning, 0);

    const pendingSettlementAmount = settlements
      .filter((s) => s.status === SettlementStatus.PENDING)
      .reduce((acc, s) => acc + s.netEarning, 0);

    const settledAmount = settlements
      .filter((s) => s.status === SettlementStatus.SETTLED)
      .reduce((acc, s) => acc + s.netEarning, 0);

    // Cash Payment Platform Payables summary
    const cashSettlements = settlements.filter(s => s.platformSettlementStatus && s.platformSettlementStatus !== PlatformSettlementStatus.NOT_APPLICABLE);
    const totalCashCollected = cashSettlements.reduce((acc, s) => acc + (s.cashCollectedByProvider || 0), 0);
    const totalPlatformFeeDue = cashSettlements
      .filter(s => s.platformSettlementStatus === PlatformSettlementStatus.DUE)
      .reduce((acc, s) => acc + (s.platformPayableAmount || 0), 0);
    const totalPlatformFeePaid = cashSettlements
      .filter(s => s.platformSettlementStatus === PlatformSettlementStatus.PAID || s.platformSettlementStatus === PlatformSettlementStatus.VERIFIED || s.platformSettlementStatus === PlatformSettlementStatus.SUBMITTED)
      .reduce((acc, s) => acc + (s.platformPayableAmount || 0), 0);

    return res.json({
      success: true,
      summary: {
        totalGross,
        totalPlatformFee,
        totalNetEarnings,
        pendingSettlementAmount,
        settledAmount,
        totalBookings: settlements.length,
        totalCashCollected,
        totalPlatformFeeDue,
        totalPlatformFeePaid,
        cashBookingsCount: cashSettlements.length,
      },
      settlements,
    });
  } catch (error) {
    next(error);
  }
};

// 1B. Get Provider Cash Platform Payables Ledger
export const getMyCashPayables = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entityUserId = req.user!.id;

    const filter: any = {
      entityUserId,
      platformSettlementStatus: { $in: [PlatformSettlementStatus.DUE, PlatformSettlementStatus.SUBMITTED, PlatformSettlementStatus.VERIFIED, PlatformSettlementStatus.PAID, PlatformSettlementStatus.DISPUTED] },
    };

    const cashSettlements = await Settlement.find(filter)
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'serviceId', select: 'name' },
          { path: 'customerId', select: 'name phone email' },
        ],
      })
      .sort({ createdAt: -1 });

    const totalCashCollected = cashSettlements.reduce((acc, s) => acc + (s.cashCollectedByProvider || 0), 0);
    const totalPlatformFeeDue = cashSettlements
      .filter((s) => s.platformSettlementStatus === PlatformSettlementStatus.DUE)
      .reduce((acc, s) => acc + (s.platformPayableAmount || 0), 0);

    const totalPlatformFeePaid = cashSettlements
      .filter((s) => s.platformSettlementStatus === PlatformSettlementStatus.PAID || s.platformSettlementStatus === PlatformSettlementStatus.VERIFIED || s.platformSettlementStatus === PlatformSettlementStatus.SUBMITTED)
      .reduce((acc, s) => acc + (s.platformPayableAmount || 0), 0);

    return res.json({
      success: true,
      summary: {
        totalCashCollected,
        totalPlatformFeeDue,
        totalPlatformFeePaid,
        cashBookingsCount: cashSettlements.length,
        lastUpdated: new Date().toISOString(),
      },
      cashSettlements,
    });
  } catch (error) {
    next(error);
  }
};

// 1C. Provider: Pay Platform Amount Due
export const payPlatformFee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entityUserId = req.user!.id;
    const { txnReference, settlementIds } = req.body;

    const filter: any = {
      entityUserId,
      platformSettlementStatus: { $in: [PlatformSettlementStatus.DUE, PlatformSettlementStatus.SUBMITTED] },
    };

    if (settlementIds && Array.isArray(settlementIds) && settlementIds.length > 0) {
      filter._id = { $in: settlementIds };
    }

    let records = await Settlement.find(filter);

    // Fallback: If no settlement records exist yet, sync completed/paid cash bookings for this provider
    if (records.length === 0) {
      const unlinkedBookings = await Booking.find({
        $or: [{ providerId: entityUserId }, { assignedProviderId: entityUserId }],
        status: { $in: [BookingStatus.COMPLETED, BookingStatus.PAID] },
        paymentStatus: PaymentStatus.PAID,
      });

      for (const b of unlinkedBookings) {
        await createEarningLedgerRecord(b._id.toString());
      }

      records = await Settlement.find(filter);
    }

    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'No outstanding cash platform fee due found for payment.' });
    }

    const ref = txnReference || `PAY-PLATFORM-${Date.now()}`;
    const now = new Date();
    let totalPaid = 0;

    for (const record of records) {
      record.platformSettlementStatus = PlatformSettlementStatus.PAID;
      record.platformPaymentTxnId = ref;
      record.paidToPlatformAt = now;
      record.notes = `Platform fee payment of ₹${record.platformPayableAmount || record.platformFee} paid by provider (Ref: ${ref})`;
      await record.save();
      totalPaid += (record.platformPayableAmount || record.platformFee || 0);
    }

    return res.json({
      success: true,
      message: `Platform fee payment of ₹${totalPaid} recorded successfully. Platform amount due cleared!`,
      reference: ref,
      count: records.length,
      totalAmountPaid: totalPaid,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Admin: Get Master Settlements Ledger
export const getAdminSettlements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, entityRole } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (entityRole) filter.entityRole = entityRole;

    const settlements = await Settlement.find(filter)
      .populate('entityUserId', 'email phone role fullName')
      .populate({
        path: 'bookingId',
        populate: { path: 'serviceId' },
      })
      .sort({ createdAt: -1 });

    const totalGross = settlements.reduce((acc, s) => acc + s.grossAmount, 0);
    const totalPlatformFees = settlements.reduce((acc, s) => acc + s.platformFee, 0);
    const totalNetPayable = settlements.reduce((acc, s) => acc + s.netEarning, 0);

    const pendingPayable = settlements
      .filter((s) => s.status === SettlementStatus.PENDING)
      .reduce((acc, s) => acc + s.netEarning, 0);

    const settledTotal = settlements
      .filter((s) => s.status === SettlementStatus.SETTLED)
      .reduce((acc, s) => acc + s.netEarning, 0);

    return res.json({
      success: true,
      summary: {
        totalGross,
        totalPlatformFees,
        totalNetPayable,
        pendingPayable,
        settledTotal,
        count: settlements.length,
      },
      settlements,
    });
  } catch (error) {
    next(error);
  }
};

// 2B. Admin: Get Provider Platform Payables Ledger (Cash Collections)
export const getAdminCashPayables = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;

    const filter: any = {
      platformSettlementStatus: { $ne: PlatformSettlementStatus.NOT_APPLICABLE },
    };

    if (status && status !== 'ALL') {
      filter.platformSettlementStatus = status;
    }

    const settlements = await Settlement.find(filter)
      .populate('entityUserId', 'fullName email phone role')
      .populate({
        path: 'bookingId',
        populate: { path: 'serviceId', select: 'name' },
      })
      .sort({ createdAt: -1 });

    const totalCashCollectedAll = settlements.reduce((acc, s) => acc + (s.cashCollectedByProvider || 0), 0);
    const totalPlatformFeeDueAll = settlements
      .filter((s) => s.platformSettlementStatus === PlatformSettlementStatus.DUE)
      .reduce((acc, s) => acc + (s.platformPayableAmount || 0), 0);

    const totalPlatformFeePaidAll = settlements
      .filter((s) => s.platformSettlementStatus === PlatformSettlementStatus.PAID || s.platformSettlementStatus === PlatformSettlementStatus.VERIFIED || s.platformSettlementStatus === PlatformSettlementStatus.SUBMITTED)
      .reduce((acc, s) => acc + (s.platformPayableAmount || 0), 0);

    return res.json({
      success: true,
      summary: {
        totalCashCollected: totalCashCollectedAll,
        totalPlatformFeeDue: totalPlatformFeeDueAll,
        totalPlatformFeePaid: totalPlatformFeePaidAll,
        count: settlements.length,
      },
      settlements,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Admin: Process Settlement Payout (Online Bookings)
export const processSettlement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { settlementId } = req.params;
    const { settlementReference, notes } = req.body;

    const record = await Settlement.findById(settlementId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Settlement record not found' });
    }

    if (record.status === SettlementStatus.SETTLED) {
      return res.status(400).json({ success: false, message: 'Settlement record is already marked as SETTLED' });
    }

    record.status = SettlementStatus.SETTLED;
    record.settledAt = new Date();
    record.settlementReference = settlementReference || `TXN-SETTLE-${Date.now()}`;
    record.notes = notes;
    await record.save();

    return res.json({
      success: true,
      message: `Settlement of ₹${record.netEarning} marked as SETTLED successfully`,
      settlement: record,
    });
  } catch (error) {
    next(error);
  }
};

// 3B. Admin: Verify Cash Platform Settlement
export const adminVerifyCashSettlement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes, txnReference } = req.body;

    const record = await Settlement.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Cash settlement record not found' });
    }

    const newStatus = status || PlatformSettlementStatus.PAID;
    record.platformSettlementStatus = newStatus as PlatformSettlementStatus;
    record.paidToPlatformAt = new Date();
    if (txnReference) record.platformPaymentTxnId = txnReference;
    if (notes) record.notes = notes;
    await record.save();

    return res.json({
      success: true,
      message: `Cash platform payable updated to ${newStatus} successfully.`,
      settlement: record,
    });
  } catch (error) {
    next(error);
  }
};
