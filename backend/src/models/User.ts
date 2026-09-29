import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, VerificationStatus } from '../constants/enums';

export interface IUserPreferences {
  notifications: {
    email: boolean;
    sms: boolean;
  };
  language: string;
  theme: string;
}

export interface IUser extends Document {
  authProviderId?: string; // Managed Provider UID (Firebase / Supabase / Clerk)
  email: string;
  phone?: string;
  role: UserRole;
  plan: string;
  preferences: IUserPreferences;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  isGuest: boolean;
  isActive: boolean;
  isBlocked: boolean;
  blockedAt?: Date | null;
  blockedReason?: string | null;
  blockedBy?: mongoose.Types.ObjectId | null;
  passwordHash?: string;
  resetPasswordTokenHash?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    authProviderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    role: { type: String, enum: Object.values(UserRole), required: true, default: UserRole.CUSTOMER },
    plan: { type: String, default: 'standard' },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
      },
      language: { type: String, default: 'en' },
      theme: { type: String, default: 'light' },
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: function (this: IUser) {
        if (this.role === UserRole.CUSTOMER || this.role === UserRole.ADMIN) {
          return VerificationStatus.NOT_REQUIRED;
        }
        return VerificationStatus.PENDING_VERIFICATION;
      },
    },
    rejectionReason: { type: String, default: null },
    isGuest: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false, index: true },
    blockedAt: { type: Date, default: null },
    blockedReason: { type: String, default: null },
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    passwordHash: { type: String, default: null },
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
