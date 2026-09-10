import { z } from 'zod';
import { UserRole } from '../constants/enums';

export const registerCustomerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Full name is required'),
    phone: z.string().min(8, 'Phone number is required'),
    gender: z.string().optional(),
    dob: z.string().optional(),
  }),
});

export const registerProviderSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Full name is required'),
    phone: z.string().min(8, 'Phone number is required'),
    category: z.string().min(1, 'Category ID is required'),
    qualification: z.string().min(2, 'Qualification is required'),
    experienceYears: z.number().min(0, 'Experience years must be positive'),
    bio: z.string().optional(),
    chargesPerSession: z.number().min(0, 'Charges per session required'),
    homeVisitAvailable: z.boolean().default(true),
    clinicVisitAvailable: z.boolean().default(false),
    serviceLocations: z.array(z.string()).optional(),
  }),
});

export const registerClinicSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    clinicName: z.string().min(2, 'Clinic name is required'),
    ownerContactPerson: z.string().min(2, 'Contact person name required'),
    phone: z.string().min(8, 'Phone number required'),
    addressLine1: z.string().min(3, 'Address line 1 required'),
    city: z.string().min(2, 'City required'),
    state: z.string().min(2, 'State required'),
    pincode: z.string().min(4, 'Pincode required'),
    description: z.string().optional(),
    googleMapsUrl: z.string().optional(),
    homeVisitAvailable: z.boolean().default(false),
  }),
});

export const registerLabSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    labName: z.string().min(2, 'Lab name is required'),
    contactPerson: z.string().min(2, 'Contact person required'),
    phone: z.string().min(8, 'Phone number required'),
    addressLine1: z.string().min(3, 'Address line 1 required'),
    city: z.string().min(2, 'City required'),
    state: z.string().min(2, 'State required'),
    pincode: z.string().min(4, 'Pincode required'),
    description: z.string().optional(),
    homeSampleCollectionAvailable: z.boolean().default(true),
    labVisitAvailable: z.boolean().default(true),
    homeCollectionFee: z.number().default(150),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});
