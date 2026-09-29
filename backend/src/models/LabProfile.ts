import mongoose, { Schema, Document } from 'mongoose';
import { IWorkingHours } from './ProviderProfile';

export interface ILabProfile extends Document {
  userId: mongoose.Types.ObjectId;
  labName: string;
  contactPerson: string;
  phone: string;
  email: string;

  // Lab Registration Details
  labCertNumber?: string;
  labCertDocId?: mongoose.Types.ObjectId;

  // Lab Address
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;

  // Owner Details
  ownerFullName?: string;
  ownerAadhaarDocId?: mongoose.Types.ObjectId;
  ownerPanDocId?: mongoose.Types.ObjectId;

  // Qualification Details
  dmltQualification?: string;
  dmltCertNumber?: string;
  dmltCertDocId?: mongoose.Types.ObjectId;

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

    labCertNumber: { type: String },
    labCertDocId: { type: Schema.Types.ObjectId, ref: 'Document' },

    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    district: { type: String },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },

    ownerFullName: { type: String },
    ownerAadhaarDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    ownerPanDocId: { type: Schema.Types.ObjectId, ref: 'Document' },

    dmltQualification: { type: String },
    dmltCertNumber: { type: String },
    dmltCertDocId: { type: Schema.Types.ObjectId, ref: 'Document' },

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
