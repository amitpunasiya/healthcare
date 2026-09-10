import mongoose, { Schema, Document } from 'mongoose';
import { RefundStatus } from '../constants/enums';

export interface IRefund extends Document {
  refundId: string;
  bookingId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;

  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  initiatedBy: 'CUSTOMER' | 'PROVIDER' | 'CLINIC' | 'LAB' | 'ADMIN';
  initiatedByUserId: mongoose.Types.ObjectId;

  gatewayRefundId?: string;
  failureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema: Schema = new Schema(
  {
    refundId: { type: String, required: true, unique: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: Object.values(RefundStatus), default: RefundStatus.PENDING, index: true },
    reason: { type: String, required: true },
    initiatedBy: { type: String, enum: ['CUSTOMER', 'PROVIDER', 'CLINIC', 'LAB', 'ADMIN'], required: true },
    initiatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    gatewayRefundId: { type: String, index: true },
    failureReason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IRefund>('Refund', RefundSchema);
