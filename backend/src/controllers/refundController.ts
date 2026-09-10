import { Response, NextFunction } from 'express';
import Refund from '../models/Refund';
import Payment from '../models/Payment';
import Booking from '../models/Booking';
import { AuthRequest } from '../middlewares/auth';
import { RefundStatus, PaymentStatus, UserRole } from '../constants/enums';
import { createNotification } from '../services/notificationService';

// 1. Get All Refunds (Admin) or Customer Refunds
export const getRefunds = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { status, bookingId } = req.query;

    const filter: any = {};
    if (role === UserRole.CUSTOMER) {
      filter.customerId = userId;
    }

    if (status) filter.status = status;
    if (bookingId) filter.bookingId = bookingId;

    const refunds = await Refund.find(filter)
      .populate('bookingId')
      .populate('paymentId')
      .populate('customerId', 'email phone')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: refunds.length, refunds });
  } catch (error) {
    next(error);
  }
};

// 2. Initiate Admin Authorized Refund
export const initiateAdminRefund = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.id;
    const { paymentId, amount, reason } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      return res.status(400).json({ success: false, message: `Payment is in '${payment.status}' status and cannot be refunded.` });
    }

    const refundAmount = Number(amount) || payment.amount;
    if (refundAmount > payment.amount) {
      return res.status(400).json({ success: false, message: `Refund amount cannot exceed original payment amount of ₹${payment.amount}` });
    }

    const refundNumber = `RF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const refund = await Refund.create({
      refundId: refundNumber,
      bookingId: payment.bookingId,
      paymentId: payment._id,
      customerId: payment.customerId,
      amount: refundAmount,
      currency: 'INR',
      status: RefundStatus.PROCESSED,
      reason: reason || 'Admin Authorized Manual Refund',
      initiatedBy: 'ADMIN',
      initiatedByUserId: adminId,
      gatewayRefundId: `rfnd_admin_${Date.now()}`,
    });

    payment.status = refundAmount === payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
    await payment.save();

    await createNotification(
      payment.customerId,
      'Admin Refund Processed',
      `A refund of ₹${refundAmount} has been processed for your booking. Reason: ${reason || 'Admin adjustment'}`,
      'REFUND_INITIATED',
      payment.bookingId.toString()
    );

    return res.status(201).json({
      success: true,
      message: `Refund of ₹${refundAmount} processed successfully by Admin`,
      refund,
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Retry Failed Refund
export const retryFailedRefund = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refundId } = req.params;

    const refund = await Refund.findById(refundId);
    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund record not found' });
    }

    if (refund.status !== RefundStatus.FAILED) {
      return res.status(400).json({ success: false, message: `Refund status is '${refund.status}'. Only FAILED refunds can be retried.` });
    }

    refund.status = RefundStatus.PROCESSED;
    refund.failureReason = undefined;
    refund.gatewayRefundId = `rfnd_retry_${Date.now()}`;
    await refund.save();

    await Payment.findByIdAndUpdate(refund.paymentId, { status: PaymentStatus.REFUNDED });

    return res.json({ success: true, message: 'Refund retried and processed successfully', refund });
  } catch (error) {
    next(error);
  }
};
