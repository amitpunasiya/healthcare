import { Response, NextFunction } from 'express';
import Settlement from '../models/Settlement';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import { AuthRequest } from '../middlewares/auth';
import { UserRole, SettlementStatus, PaymentStatus } from '../constants/enums';

// Helper: Generate Earning Ledger Entry when Booking is COMPLETED
export const createEarningLedgerRecord = async (bookingId: string) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return null;

    const entityUserId = booking.providerId || booking.clinicId || booking.labId;
    if (!entityUserId) return null;

    let entityRole = UserRole.PROVIDER;
    if (booking.clinicId) entityRole = UserRole.CLINIC;
    else if (booking.labId) entityRole = UserRole.LAB;

    const payment = await Payment.findOne({ bookingId: booking._id });
    const grossAmount = booking.pricing.totalAmount;
    const platformFee = Math.round(grossAmount * 0.1); // 10% platform commission
    const taxAmount = 0;
    const netEarning = grossAmount - platformFee - taxAmount;

    const settlementId = `STL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const existing = await Settlement.findOne({ bookingId: booking._id });
    if (existing) return existing;

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

    return res.json({
      success: true,
      summary: {
        totalGross,
        totalPlatformFee,
        totalNetEarnings,
        pendingSettlementAmount,
        settledAmount,
        totalBookings: settlements.length,
      },
      settlements,
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
      .populate('entityUserId', 'email phone role')
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

// 3. Admin: Process Settlement Payout
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
