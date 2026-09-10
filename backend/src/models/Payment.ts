import mongoose, { Schema, Document } from 'mongoose';
import { PaymentStatus, PaymentMethod, PaymentSource } from '../constants/enums';

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  providerId?: mongoose.Types.ObjectId;
  clinicId?: mongoose.Types.ObjectId;
  labId?: mongoose.Types.ObjectId;

  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;

  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentSource: PaymentSource;

  paidAt?: Date;
  failureReason?: string;

  pricingBreakdown: {
    baseFee: number;
    homeCollectionFee: number;
    platformFee: number;
    taxAmount: number;
    discountFee: number;
    totalAmount: number;
  };

  rawWebhookEvents?: any[];
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    clinicId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    labId: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    gatewayOrderId: { type: String, index: true },
    gatewayPaymentId: { type: String, index: true },
    gatewaySignature: { type: String },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING, index: true },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod), default: PaymentMethod.RAZORPAY },
    paymentSource: { type: String, enum: Object.values(PaymentSource), default: PaymentSource.ONLINE },

    paidAt: { type: Date },
    failureReason: { type: String },

    pricingBreakdown: {
      baseFee: { type: Number, required: true },
      homeCollectionFee: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      discountFee: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
    },

    rawWebhookEvents: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: true }
);

PaymentSchema.index({ gatewayOrderId: 1, gatewayPaymentId: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
