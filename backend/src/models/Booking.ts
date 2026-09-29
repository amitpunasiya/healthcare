import mongoose, { Schema, Document } from 'mongoose';
import { BookingSource, ServiceMode, EngagementType, BookingStatus } from '../constants/enums';

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IStatusHistoryItem {
  status: BookingStatus;
  changedBy: mongoose.Types.ObjectId;
  timestamp: Date;
  notes?: string;
}

export interface IRecurringConfig {
  frequency: 'DAILY' | 'WEEKLY';
  interval?: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD
  durationWeeks?: number;
  daysOfWeek?: number[]; // [1, 3, 5] (1=Mon, 7/0=Sun)
  preferredTimeSlot: { startTime: string; endTime: string };
  totalSessionsExpected?: number;
}

export interface IBooking extends Document {
  bookingNumber: string;
  bookingSource: BookingSource;
  createdById: mongoose.Types.ObjectId;

  customerId: mongoose.Types.ObjectId;
  customerDetails: {
    name: string;
    phone: string;
    email?: string;
  };

  providerId?: mongoose.Types.ObjectId;
  assignedProviderId?: mongoose.Types.ObjectId;
  clinicId?: mongoose.Types.ObjectId;
  labId?: mongoose.Types.ObjectId;

  serviceCategoryId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  serviceMode: ServiceMode;
  engagementType: EngagementType;

  // Recurring Parent / Child Architecture
  isRecurringParent?: boolean;
  parentBookingId?: mongoose.Types.ObjectId;
  planStatus?: PlanStatus;
  recurringConfig?: IRecurringConfig;

  serviceAddress?: {
    label?: string;
    addressLine1: string;
    addressLine2?: string;
    houseNumber?: string;
    flatNumber?: string;
    buildingName?: string;
    street?: string;
    area?: string;
    district?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
    countryCode?: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
  };

  bookingDate: string; // YYYY-MM-DD
  timeSlot: {
    startTime: string;
    endTime: string;
  };

  pricing: {
    baseFee: number;
    homeCollectionFee: number;
    discountFee: number;
    totalAmount: number;
  };

  nearbyProviderCount?: number;
  providerResponses?: Array<{
    providerId: mongoose.Types.ObjectId;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
    respondedAt?: Date;
    distance?: number;
    rejectionReason?: string;
  }>;

  serviceOtp?: string;
  serviceOtpHash?: string;
  serviceStartedAt?: Date;
  serviceCompletedAt?: Date;
  paymentStatus?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  paidAt?: Date;

  status: BookingStatus;
  statusHistory: IStatusHistoryItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringConfigSchema = new Schema({
  frequency: { type: String, enum: ['DAILY', 'WEEKLY'], required: true },
  interval: { type: Number, default: 1 },
  startDate: { type: String, required: true },
  endDate: { type: String },
  durationWeeks: { type: Number, default: 2 },
  daysOfWeek: [{ type: Number }],
  preferredTimeSlot: {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  totalSessionsExpected: { type: Number },
});

const BookingSchema: Schema = new Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    bookingSource: { type: String, enum: Object.values(BookingSource), required: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerDetails: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
    },

    providerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedProviderId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    clinicId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    labId: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    serviceCategoryId: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    serviceMode: { type: String, enum: Object.values(ServiceMode), required: true },
    engagementType: { type: String, enum: Object.values(EngagementType), default: EngagementType.ONE_TIME },

    // Recurring Parent / Child session relationship
    isRecurringParent: { type: Boolean, default: false, index: true },
    parentBookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    planStatus: { type: String, enum: Object.values(PlanStatus), default: null },
    recurringConfig: { type: RecurringConfigSchema },

    serviceAddress: {
      label: { type: String },
      addressLine1: { type: String },
      addressLine2: { type: String },
      houseNumber: { type: String },
      flatNumber: { type: String },
      buildingName: { type: String },
      street: { type: String },
      area: { type: String },
      district: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String, default: 'India' },
      countryCode: { type: String, default: 'IN' },
      landmark: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
    },

    bookingDate: { type: String, required: true, index: true }, // Format YYYY-MM-DD
    timeSlot: {
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
    },

    pricing: {
      baseFee: { type: Number, required: true },
      homeCollectionFee: { type: Number, default: 0 },
      discountFee: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
    },

    nearbyProviderCount: { type: Number, default: 0 },
    providerResponses: [
      {
        providerId: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
        respondedAt: { type: Date },
        distance: { type: Number },
        rejectionReason: { type: String },
      },
    ],

    serviceOtp: { type: String },
    serviceOtpHash: { type: String },
    serviceStartedAt: { type: Date },
    serviceCompletedAt: { type: Date },
    paymentStatus: { type: String, default: 'PENDING', index: true },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    paidAt: { type: Date },

    status: { type: String, enum: Object.values(BookingStatus), default: BookingStatus.REQUESTED, index: true },
    statusHistory: [
      {
        status: { type: String, enum: Object.values(BookingStatus), required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
    notes: { type: String },
  },
  { timestamps: true }
);

// Compound indexes for availability conflict checks, parent-child listings & analytics
BookingSchema.index({ providerId: 1, bookingDate: 1, 'timeSlot.startTime': 1 });
BookingSchema.index({ providerId: 1, bookingDate: 1, status: 1 });
BookingSchema.index({ assignedProviderId: 1, bookingDate: 1, status: 1 });
BookingSchema.index({ clinicId: 1, bookingDate: 1, 'timeSlot.startTime': 1 });
BookingSchema.index({ labId: 1, bookingDate: 1, 'timeSlot.startTime': 1 });

export default mongoose.model<IBooking>('Booking', BookingSchema);
