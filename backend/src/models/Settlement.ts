import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, SettlementStatus } from '../constants/enums';

export interface ISettlement extends Document {
  settlementId: string;
  bookingId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  entityRole: UserRole; // PROVIDER, CLINIC, LAB
  entityUserId: mongoose.Types.ObjectId;

  grossAmount: number;
  platformFee: number;
  taxAmount: number;
  netEarning: number;

  status: SettlementStatus;
  settledAt?: Date;
  settlementReference?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema: Schema = new Schema(
  {
    settlementId: { type: String, required: true, unique: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    entityRole: { type: String, enum: [UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB], required: true },
    entityUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    grossAmount: { type: Number, required: true },
    platformFee: { type: Number, required: true, default: 0 },
    taxAmount: { type: Number, required: true, default: 0 },
    netEarning: { type: Number, required: true },

    status: { type: String, enum: Object.values(SettlementStatus), default: SettlementStatus.PENDING, index: true },
    settledAt: { type: Date },
    settlementReference: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

SettlementSchema.index({ entityUserId: 1, status: 1 });

export default mongoose.model<ISettlement>('Settlement', SettlementSchema);
