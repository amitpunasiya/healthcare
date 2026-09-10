import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkingHours {
  day: string; // e.g. Monday, Tuesday
  available: boolean;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "18:00"
}

export interface IProviderProfile extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  photo?: string;
  category: mongoose.Types.ObjectId;
  qualification: string;
  experienceYears: number;
  bio?: string;
  servicesOffered: mongoose.Types.ObjectId[];
  chargesPerSession: number;
  homeVisitAvailable: boolean;
  clinicVisitAvailable: boolean;
  serviceLocations: string[];
  workingHours: IWorkingHours[];
  address?: string;
  city?: string;
  pincode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkingHoursSchema = new Schema({
  day: { type: String, required: true },
  available: { type: Boolean, default: true },
  startTime: { type: String, default: '09:00' },
  endTime: { type: String, default: '18:00' },
});

const ProviderProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    photo: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    qualification: { type: String, required: true },
    experienceYears: { type: Number, required: true, default: 0 },
    bio: { type: String },
    servicesOffered: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    chargesPerSession: { type: Number, required: true, default: 0 },
    homeVisitAvailable: { type: Boolean, default: true },
    clinicVisitAvailable: { type: Boolean, default: false },
    serviceLocations: [{ type: String }],
    workingHours: [WorkingHoursSchema],
    address: { type: String },
    city: { type: String },
    pincode: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IProviderProfile>('ProviderProfile', ProviderProfileSchema);
