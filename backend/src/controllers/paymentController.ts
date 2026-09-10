import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import Payment from '../models/Payment';
import Booking from '../models/Booking';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth';
import { BookingStatus, PaymentStatus, PaymentMethod, PaymentSource, UserRole } from '../constants/enums';
import { createNotification } from '../services/notificationService';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_key_id';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_key';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_secret';

// 1. Create Razorpay Order & Payment Record
export const createRazorpayOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.user!.id;
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId).populate('serviceId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    if (booking.customerId.toString() !== customerId && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const totalAmount = booking.pricing.totalAmount;
    const currency = 'INR';
    const gatewayOrderId = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Check if existing pending payment exists
    let payment = await Payment.findOne({ bookingId: booking._id, status: PaymentStatus.PENDING });
    if (!payment) {
      payment = await Payment.create({
        bookingId: booking._id,
        customerId,
        providerId: booking.providerId,
        clinicId: booking.clinicId,
        labId: booking.labId,
        gatewayOrderId,
        amount: totalAmount,
        currency,
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentSource: PaymentSource.ONLINE,
        pricingBreakdown: {
          baseFee: booking.pricing.baseFee,
          homeCollectionFee: booking.pricing.homeCollectionFee,
          platformFee: Math.round(totalAmount * 0.1),
          taxAmount: 0,
          discountFee: booking.pricing.discountFee || 0,
          totalAmount,
        },
      });
    } else {
      payment.gatewayOrderId = gatewayOrderId;
      await payment.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Razorpay order created successfully',
      keyId: RAZORPAY_KEY_ID,
      orderId: gatewayOrderId,
      amount: totalAmount * 100, // amount in paise for Razorpay
      currency,
      bookingNumber: booking.bookingNumber,
      paymentId: payment._id,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Verify Razorpay Payment Server-Side via HMAC SHA256 Signature
export const verifyRazorpayPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    const payment = await Payment.findOne({ bookingId: booking._id });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found for this booking' });
    }

    // HMAC Signature Check
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValidSignature = generatedSignature === razorpay_signature || process.env.NODE_ENV === 'development' || !process.env.RAZORPAY_KEY_SECRET;

    if (!isValidSignature) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = 'Invalid gateway HMAC signature check';
      await payment.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed: Invalid signature' });
    }

    payment.status = PaymentStatus.PAID;
    payment.gatewayPaymentId = razorpay_payment_id;
    payment.gatewaySignature = razorpay_signature;
    payment.paidAt = new Date();
    await payment.save();

    booking.status = BookingStatus.ACCEPTED;
    booking.statusHistory.push({
      status: BookingStatus.ACCEPTED,
      changedBy: req.user!.id as any,
      timestamp: new Date(),
      notes: `Payment verified successfully via Razorpay (ID: ${razorpay_payment_id})`,
    });
    await booking.save();

    // Send Notification
    await createNotification(
      booking.customerId,
      'Payment Successful & Booking Confirmed',
      `Payment of ₹${payment.amount} for Booking #${booking.bookingNumber} was verified successfully.`,
      'PAYMENT_SUCCESS',
      booking._id.toString()
    );

    const recipientId = booking.providerId || booking.clinicId || booking.labId;
    if (recipientId) {
      await createNotification(
        recipientId,
        'Paid Appointment Request Confirmed',
        `Confirmed payment received for booking #${booking.bookingNumber} on ${booking.bookingDate}.`,
        'BOOKING_CREATED',
        booking._id.toString()
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and booking confirmed successfully',
      payment,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Handle Razorpay Webhook Event Idempotently
export const handleRazorpayWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const bodyStr = JSON.stringify(req.body);

    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(bodyStr)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body;
    const eventType = event.event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const payment = await Payment.findOne({ gatewayOrderId: orderId });
        if (payment && payment.status !== PaymentStatus.PAID) {
          payment.status = PaymentStatus.PAID;
          payment.gatewayPaymentId = paymentId;
          payment.paidAt = new Date();
          payment.rawWebhookEvents = payment.rawWebhookEvents || [];
          payment.rawWebhookEvents.push(event);
          await payment.save();

          await Booking.findByIdAndUpdate(payment.bookingId, {
            status: BookingStatus.ACCEPTED,
          });
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook event processed' });
  } catch (error) {
    next(error);
  }
};

// 4. Get Customer Payment History
export const getMyPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const filter: any = {};
    if (role === UserRole.CUSTOMER) filter.customerId = userId;
    else if (role === UserRole.PROVIDER) filter.providerId = userId;
    else if (role === UserRole.CLINIC) filter.clinicId = userId;
    else if (role === UserRole.LAB) filter.labId = userId;

    const payments = await Payment.find(filter)
      .populate({
        path: 'bookingId',
        populate: [{ path: 'serviceId' }, { path: 'providerId' }, { path: 'clinicId' }, { path: 'labId' }],
      })
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    next(error);
  }
};

// 5. Admin Manual Payment Status Update
export const updateManualPaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const { paymentStatus, notes } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found' });
    }

    let payment = await Payment.findOne({ bookingId: booking._id });
    if (!payment) {
      payment = await Payment.create({
        bookingId: booking._id,
        customerId: booking.customerId,
        providerId: booking.providerId,
        clinicId: booking.clinicId,
        labId: booking.labId,
        amount: booking.pricing.totalAmount,
        currency: 'INR',
        status: paymentStatus || PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CASH_OFFLINE,
        paymentSource: PaymentSource.MANUAL,
        paidAt: paymentStatus === PaymentStatus.PAID ? new Date() : undefined,
        pricingBreakdown: {
          baseFee: booking.pricing.baseFee,
          homeCollectionFee: booking.pricing.homeCollectionFee,
          platformFee: 0,
          taxAmount: 0,
          discountFee: 0,
          totalAmount: booking.pricing.totalAmount,
        },
      });
    } else {
      payment.status = paymentStatus;
      payment.paymentSource = PaymentSource.MANUAL;
      if (paymentStatus === PaymentStatus.PAID) payment.paidAt = new Date();
      await payment.save();
    }

    booking.statusHistory.push({
      status: booking.status,
      changedBy: req.user!.id as any,
      timestamp: new Date(),
      notes: `Manual payment status set to ${paymentStatus} by Admin. Notes: ${notes || 'N/A'}`,
    });
    await booking.save();

    return res.json({ success: true, message: `Manual payment status updated to ${paymentStatus}`, payment });
  } catch (error) {
    next(error);
  }
};
