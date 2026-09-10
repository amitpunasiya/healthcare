import mongoose, { Schema, Document } from 'mongoose';
import { IWorkingHours } from './ProviderProfile';

export interface ILabProfile extends Document {
  userId: mongoose.Types.ObjectId;
  labName: string;
  contactPerson: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  photos: string[];
  description?: string;
  testsOffered: mongoose.Types.ObjectId[];
  homeSampleCollectionAvailable: boolean;
  labVisitAvailable: boolean;
  homeCollectionFee: number;
  openingHours: IWorkingHours[];
  createdAt: Date;
  updatedAt: Date;
}

const LabProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    labName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    photos: [{ type: String }],
    description: { type: String },
    testsOffered: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    homeSampleCollectionAvailable: { type: Boolean, default: true },
    labVisitAvailable: { type: Boolean, default: true },
    homeCollectionFee: { type: Number, default: 150 },
    openingHours: [
      {
        day: { type: String, required: true },
        available: { type: Boolean, default: true },
        startTime: { type: String, default: '07:00' },
        endTime: { type: String, default: '19:00' },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<ILabProfile>('LabProfile', LabProfileSchema);
