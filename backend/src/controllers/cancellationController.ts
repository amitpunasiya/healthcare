import { Response, NextFunction } from 'express';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import Refund from '../models/Refund';
import { AuthRequest } from '../middlewares/auth';
import { BookingStatus, PaymentStatus, RefundStatus, UserRole } from '../constants/enums';
import { calculateCancellationRefund } from '../services/cancellationService';
import { createNotification } from '../services/notificationService';

export const cancelBookingWithRefund = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
      return res.status(400).json({ success: false, message: `Booking is already in '${booking.status}' status.` });
    }

    // Find payment record
    const payment = await Payment.findOne({ bookingId: booking._id });
    const paidAmount = payment && payment.status === PaymentStatus.PAID ? payment.amount : 0;

    // Calculate cancellation refund eligibility
    const calc = await calculateCancellationRefund(
      booking.bookingDate,
      booking.timeSlot?.startTime || '09:00',
      paidAmount,
      userRole
    );

    booking.status = BookingStatus.CANCELLED;
    const reasonText = cancellationReason ? `Cancelled: ${cancellationReason}` : 'Booking cancelled by user';
    booking.notes = booking.notes ? `${booking.notes} | ${reasonText}` : reasonText;

    booking.statusHistory.push({
      status: BookingStatus.CANCELLED,
      changedBy: userId as any,
      timestamp: new Date(),
      notes: `${reasonText} | Policy: ${calc.policyNotes}`,
    });

    await booking.save();

    let refundRecord = null;

    if (payment && paidAmount > 0 && calc.eligibleForRefund) {
      const refundNumber = `RF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      refundRecord = await Refund.create({
        refundId: refundNumber,
        bookingId: booking._id,
        paymentId: payment._id,
        customerId: booking.customerId,
        amount: calc.refundAmount,
        currency: 'INR',
        status: RefundStatus.PROCESSED, // Mark processed (or PENDING if Gateway API is called)
        reason: cancellationReason || 'Booking Cancellation Refund',
        initiatedBy: userRole as any,
        initiatedByUserId: userId,
        gatewayRefundId: `rfnd_mock_${Date.now()}`,
      });

      payment.status = calc.refundAmount === paidAmount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
      await payment.save();

      // Send Refund Notification to Customer
      await createNotification(
        booking.customerId,
        'Refund Initiated for Cancelled Booking',
        `A refund of ₹${calc.refundAmount} (${calc.refundPercentage}%) has been processed for booking #${booking.bookingNumber}.`,
        'REFUND_INITIATED',
        booking._id.toString()
      );
    } else {
      // Send Cancellation Notification without refund
      await createNotification(
        booking.customerId,
        'Booking Cancelled',
        `Your booking #${booking.bookingNumber} has been CANCELLED.`,
        'BOOKING_CANCELLED',
        booking._id.toString()
      );
    }

    // Notify Provider/Clinic/Lab
    const recipientId = userRole === UserRole.CUSTOMER
      ? (booking.providerId || booking.clinicId || booking.labId)
      : booking.customerId;

    if (recipientId) {
      await createNotification(
        recipientId,
        'Booking Cancelled',
        `Booking #${booking.bookingNumber} has been CANCELLED. Reason: ${cancellationReason || 'User request'}`,
        'BOOKING_CANCELLED',
        booking._id.toString()
      );
    }

    return res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking,
      cancellationCalculation: calc,
      refund: refundRecord,
    });
  } catch (error) {
    next(error);
  }
};
