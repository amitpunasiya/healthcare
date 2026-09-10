import mongoose, { Schema, Document } from 'mongoose';

export interface ICancellationPolicy extends Document {
  policyName: string;
  fullRefundHoursBefore: number; // e.g. 24 hours
  partialRefundHoursBefore: number; // e.g. 12 hours
  partialRefundPercentage: number; // e.g. 50%
  lateCancellationPercentage: number; // e.g. 0%
  providerCancellationRefundPercentage: number; // e.g. 100%
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CancellationPolicySchema: Schema = new Schema(
  {
    policyName: { type: String, required: true, default: 'Standard Healthcare Policy' },
    fullRefundHoursBefore: { type: Number, required: true, default: 24 },
    partialRefundHoursBefore: { type: Number, required: true, default: 12 },
    partialRefundPercentage: { type: Number, required: true, default: 80 },
    lateCancellationPercentage: { type: Number, required: true, default: 50 },
    providerCancellationRefundPercentage: { type: Number, required: true, default: 100 },
    isDefault: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICancellationPolicy>('CancellationPolicy', CancellationPolicySchema);
