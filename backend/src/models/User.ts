import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, VerificationStatus } from '../constants/enums';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  phone: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  isGuest: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: {
      type: String,
      required: function (this: IUser) {
        return !this.isGuest;
      },
    },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
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
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
