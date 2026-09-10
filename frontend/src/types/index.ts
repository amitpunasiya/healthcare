export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'CLINIC' | 'LAB' | 'ADMIN';
export type VerificationStatus = 'NOT_REQUIRED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
export type BookingSource = 'ONLINE' | 'MANUAL';
export type ServiceMode = 'HOME_VISIT' | 'CLINIC_VISIT' | 'LAB_VISIT';
export type EngagementType = 'ONE_TIME' | 'REGULAR_RECURRING';
export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type PlanStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface Address {
  _id?: string;
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  isGuest?: boolean;
  fullName?: string;
  clinicName?: string;
  labName?: string;
  profile?: any;
}

export interface ServiceCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  isActive: boolean;
  displayOrder: number;
}

export interface Service {
  _id: string;
  categoryId: string | ServiceCategory;
  name: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  serviceModesSupported: ServiceMode[];
  engagementTypesSupported: EngagementType[];
  prepInstructions?: string;
  sampleCollectionInfo?: string;
  isActive: boolean;
}

export interface ProviderProfile {
  _id: string;
  userId: any;
  fullName: string;
  photo?: string;
  category: ServiceCategory;
  qualification: string;
  experienceYears: number;
  bio?: string;
  servicesOffered: Service[];
  chargesPerSession: number;
  homeVisitAvailable: boolean;
  clinicVisitAvailable: boolean;
  serviceLocations: string[];
  city?: string;
  workingHours: { day: string; available: boolean; startTime: string; endTime: string }[];
}

export interface ClinicProfile {
  _id: string;
  userId: any;
  clinicName: string;
  ownerContactPerson: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  googleMapsUrl?: string;
  description?: string;
  servicesOffered: Service[];
  openingHours: { day: string; available: boolean; startTime: string; endTime: string }[];
}

export interface LabProfile {
  _id: string;
  userId: any;
  labName: string;
  contactPerson: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  description?: string;
  testsOffered: Service[];
  homeSampleCollectionAvailable: boolean;
  labVisitAvailable: boolean;
  homeCollectionFee: number;
  openingHours?: { day: string; available: boolean; startTime: string; endTime: string }[];
}

export interface Booking {
  _id: string;
  bookingNumber: string;
  bookingSource: BookingSource;
  createdById: string;
  customerId: any;
  customerDetails: {
    name: string;
    phone: string;
    email?: string;
  };
  providerId?: any;
  clinicId?: any;
  labId?: any;
  serviceCategoryId: ServiceCategory;
  serviceId: Service;
  serviceMode: ServiceMode;
  engagementType: EngagementType;

  isRecurringParent?: boolean;
  parentBookingId?: string;
  planStatus?: PlanStatus;
  recurringConfig?: {
    frequency: 'DAILY' | 'WEEKLY';
    interval?: number;
    startDate: string;
    endDate?: string;
    durationWeeks?: number;
    daysOfWeek?: number[];
    preferredTimeSlot: { startTime: string; endTime: string };
    totalSessionsExpected?: number;
  };

  serviceAddress?: Address;
  bookingDate: string;
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
  status: BookingStatus;
  statusHistory: { status: BookingStatus; changedBy: string; timestamp: string; notes?: string }[];
  rejectionReason?: string;
  visitType?: string;
  bookingType?: string;
  totalPrice?: number;
  paymentStatus?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  address?: { street?: string; city?: string; state?: string; zipCode?: string; pincode?: string };
  notes?: string;
  createdAt: string;
}

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';
export type PaymentMethod = 'RAZORPAY' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING' | 'UPI' | 'WALLET' | 'CASH_OFFLINE' | 'BANK_TRANSFER';
export type PaymentSource = 'ONLINE' | 'MANUAL';
export type RefundStatus = 'PENDING' | 'PROCESSED' | 'FAILED';
export type SettlementStatus = 'PENDING' | 'SETTLED';

export interface PaymentRecord {
  _id: string;
  bookingId: any;
  customerId: any;
  providerId?: any;
  clinicId?: any;
  labId?: any;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentSource: PaymentSource;
  paidAt?: string;
  failureReason?: string;
  pricingBreakdown?: {
    baseFee: number;
    homeCollectionFee: number;
    platformFee: number;
    taxAmount: number;
    discountFee: number;
    totalAmount: number;
  };
  createdAt: string;
}

export interface RefundRecord {
  _id: string;
  refundId: string;
  bookingId: any;
  paymentId: any;
  customerId: any;
  amount: number;
  status: RefundStatus;
  reason: string;
  initiatedBy: string;
  gatewayRefundId?: string;
  createdAt: string;
}

export interface SettlementRecord {
  _id: string;
  settlementId: string;
  bookingId: any;
  paymentId: any;
  entityRole: UserRole;
  entityUserId: any;
  grossAmount: number;
  platformFee: number;
  taxAmount: number;
  netEarning: number;
  status: SettlementStatus;
  settledAt?: string;
  settlementReference?: string;
  createdAt: string;
}
