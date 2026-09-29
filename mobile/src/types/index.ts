export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'CLINIC' | 'LAB' | 'ADMIN';
export type VerificationStatus = 'NOT_REQUIRED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
export type BookingStatus =
  | 'REQUESTED'
  | 'SEARCHING'
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'NO_PROVIDER_FOUND'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface User {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  fullName?: string;
  verificationStatus?: VerificationStatus;
  rejectionReason?: string;
  profile?: any;
}

export interface ServiceCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  iconName?: string;
  displayOrder?: number;
}

export interface Service {
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  categoryId: string | ServiceCategory;
}

export interface Booking {
  _id: string;
  bookingNumber?: string;
  customerId?: any;
  customerName?: string;
  customerPhone?: string;
  customerDetails?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  serviceMode: 'HOME_VISIT' | 'CLINIC_VISIT' | 'LAB_VISIT';
  serviceCategory?: string;
  serviceId?: any;
  serviceCategoryId?: any;
  status: BookingStatus;
  paymentStatus?: string;
  paymentMethod?: string;
  netEarning?: number;
  platformFee?: number;
  platformPayableAmount?: number;
  platformSettlementStatus?: string;
  bookingDate: string;
  timeSlot?: {
    startTime: string;
    endTime: string;
  };
  totalAmount?: number;
  finalPayableAmount?: number;
  pricing?: {
    baseFee?: number;
    homeCollectionFee?: number;
    discountFee?: number;
    totalAmount?: number;
  };
  serviceAddress?: {
    label?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  serviceOtp?: string;
  startOtp?: string;
  providerId?: any;
  notes?: string;
  createdAt: string;
}
