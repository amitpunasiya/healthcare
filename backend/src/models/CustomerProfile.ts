import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
  _id?: string;
  label: string; // e.g. Home, Office, Parents
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface ICustomerProfile extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  gender?: string;
  dob?: string;
  emergencyContact?: string;
  addresses: IAddress[];
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema({
  label: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  landmark: { type: String },
  isDefault: { type: Boolean, default: false },
});

const CustomerProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    gender: { type: String },
    dob: { type: String },
    emergencyContact: { type: String },
    addresses: [AddressSchema],
  },
  { timestamps: true }
);

export default mongoose.model<ICustomerProfile>('CustomerProfile', CustomerProfileSchema);
