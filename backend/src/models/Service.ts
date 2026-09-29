import mongoose, { Schema, Document } from 'mongoose';
import { ServiceMode, EngagementType } from '../constants/enums';

export interface IService extends Document {
  categoryId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  serviceModesSupported: ServiceMode[];
  engagementTypesSupported: EngagementType[];
  prepInstructions?: string;
  sampleCollectionInfo?: string;
  originalPrice?: number;
  discountPercent?: number;
  testCategory?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema: Schema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    basePrice: { type: Number, required: true, default: 0 },
    originalPrice: { type: Number },
    discountPercent: { type: Number, default: 0 },
    testCategory: { type: String },
    durationMinutes: { type: Number, default: 45 },
    serviceModesSupported: [
      {
        type: String,
        enum: Object.values(ServiceMode),
        required: true,
      },
    ],
    engagementTypesSupported: [
      {
        type: String,
        enum: Object.values(EngagementType),
        default: [EngagementType.ONE_TIME],
      },
    ],
    prepInstructions: { type: String },
    sampleCollectionInfo: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IService>('Service', ServiceSchema);
