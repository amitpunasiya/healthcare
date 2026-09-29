import mongoose, { Schema, Document } from 'mongoose';
import { IWorkingHours } from './ProviderProfile';

export interface IClinicProfile extends Document {
  userId: mongoose.Types.ObjectId;
  clinicName: string;
  ownerContactPerson: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  photos: string[];
  description?: string;
  servicesOffered: mongoose.Types.ObjectId[];
  openingHours: IWorkingHours[];
  homeVisitAvailable: boolean;
  associatedProviders: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ClinicProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    clinicName: { type: String, required: true, trim: true },
    ownerContactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    googleMapsUrl: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    photos: [{ type: String }],
    description: { type: String },
    servicesOffered: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    openingHours: [
      {
        day: { type: String, required: true },
        available: { type: Boolean, default: true },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '20:00' },
      },
    ],
    homeVisitAvailable: { type: Boolean, default: false },
    associatedProviders: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model<IClinicProfile>('ClinicProfile', ClinicProfileSchema);
