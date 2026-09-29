import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkingHours {
  day: string; // e.g. Monday, Tuesday
  available: boolean;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "18:00"
}

export interface IEducationDetails {
  collegeName?: string;
  studentIdNumber?: string;
  courseName?: string;
  startYear?: number;
  completionYear?: number;
  courseStatus?: 'CURRENTLY_STUDYING' | 'COMPLETED';
}

export interface IWorkplaceExperience {
  facilityName: string;
  fromYear: number;
  toYear: number;
  certificateDocId?: mongoose.Types.ObjectId;
}

export interface INursingDetails {
  qualification?: string;
  registrationNumber?: string;
  degreeDocId?: mongoose.Types.ObjectId;
  registrationDocId?: mongoose.Types.ObjectId;
}

export interface IProviderProfile extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  photo?: string;
  category: mongoose.Types.ObjectId;
  qualification: string;
  experienceYears: number;
  experienceType?: 'FRESHER' | 'MONTHS' | 'YEARS';
  experienceValue?: number;
  education?: IEducationDetails;
  degreeDocId?: mongoose.Types.ObjectId;
  studentIdDocId?: mongoose.Types.ObjectId;
  profilePhotoDocId?: mongoose.Types.ObjectId;
  experienceCertDocId?: mongoose.Types.ObjectId;
  labCertDocId?: mongoose.Types.ObjectId;
  experienceWorkplaces?: IWorkplaceExperience[];
  aadhaarDocId?: mongoose.Types.ObjectId;
  panDocId?: mongoose.Types.ObjectId;
  aadhaarNumber?: string;
  panNumber?: string;

  // Nurse Specific Fields (Elder Care)
  isNurse?: boolean;
  nursingDetails?: INursingDetails;

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
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

const WorkingHoursSchema = new Schema({
  day: { type: String, required: true },
  available: { type: Boolean, default: true },
  startTime: { type: String, default: '09:00' },
  endTime: { type: String, default: '18:00' },
});

const WorkplaceExperienceSchema = new Schema({
  facilityName: { type: String, required: true },
  fromYear: { type: Number, required: true },
  toYear: { type: Number, required: true },
  certificateDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
});

const ProviderProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    photo: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    qualification: { type: String, required: true },
    experienceYears: { type: Number, required: true, default: 0 },
    experienceType: { type: String, enum: ['FRESHER', 'MONTHS', 'YEARS'], default: 'YEARS' },
    experienceValue: { type: Number, default: 0 },

    education: {
      collegeName: { type: String },
      studentIdNumber: { type: String },
      courseName: { type: String },
      startYear: { type: Number },
      completionYear: { type: Number },
      courseStatus: { type: String, enum: ['CURRENTLY_STUDYING', 'COMPLETED'], default: 'COMPLETED' },
    },

    degreeDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    studentIdDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    profilePhotoDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    experienceCertDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    labCertDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    experienceWorkplaces: [WorkplaceExperienceSchema],

    aadhaarDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    panDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    aadhaarNumber: { type: String },
    panNumber: { type: String },

    isNurse: { type: Boolean, default: false },
    nursingDetails: {
      qualification: { type: String },
      registrationNumber: { type: String },
      degreeDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
      registrationDocId: { type: Schema.Types.ObjectId, ref: 'Document' },
    },

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
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model<IProviderProfile>('ProviderProfile', ProviderProfileSchema);
