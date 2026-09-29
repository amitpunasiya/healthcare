import { z } from 'zod';

export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const indianPhoneRegex = /^[6-9]\d{9}$/;
export const indianPincodeRegex = /^[1-9][0-9]{5}$/;
export const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Strict detector for HTML tags, script elements, javascript: pseudo-protocols,
 * inline event handlers (onerror=, onclick=), angle brackets, and null bytes.
 * Rejects malformed / injected inputs immediately instead of silently cleaning them.
 */
export const containsHtmlOrScript = (value: string): boolean => {
  if (typeof value !== 'string') return false;
  // 1. Angle brackets (< or >)
  if (value.includes('<') || value.includes('>')) return true;
  // 2. HTML/XML-like tags: <script>, <iframe>, <img, etc.
  if (/<[a-z/!][\s\S]*>/i.test(value)) return true;
  // 3. JavaScript pseudo-protocols
  if (/javascript\s*:/i.test(value)) return true;
  // 4. Inline DOM event handlers (onload=, onerror=, etc.)
  if (/on\w+\s*=/i.test(value)) return true;
  // 5. Null bytes
  if (value.includes('\0')) return true;

  return false;
};

// --- FIELD-BY-FIELD REUSABLE SERVER-SIDE SCHEMAS ---

export const safeEmailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .min(5, 'Email must be at least 5 characters')
  .max(120, 'Email cannot exceed 120 characters')
  .regex(emailRegex, 'Please enter a valid email address')
  .refine((val) => !containsHtmlOrScript(val), {
    message: 'Email contains invalid characters or forbidden tags',
  });

export const safePasswordSchema = z
  .string({ required_error: 'Password is required' })
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .refine((val) => !val.includes('\0'), {
    message: 'Password cannot contain null bytes',
  });

export const safeNameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name cannot exceed 100 characters')
  .refine((val) => !containsHtmlOrScript(val), {
    message: 'Name cannot contain HTML tags, scripts, or dangerous characters',
  })
  .refine((val) => /^[\p{L}\s.'-]+$/u.test(val), {
    message: 'Name can only contain alphabetic letters, spaces, hyphens, and periods',
  });

export const safeTextSchema = (minLen: number, maxLen: number, required = false, fieldName = 'Text') => {
  let schema = z.string({ required_error: `${fieldName} is required` }).trim();
  if (required) {
    schema = schema.min(minLen, `${fieldName} must be at least ${minLen} characters`);
  }
  return schema
    .max(maxLen, `${fieldName} cannot exceed ${maxLen} characters`)
    .refine((val) => !containsHtmlOrScript(val), {
      message: `${fieldName} cannot contain HTML tags, scripts, or dangerous characters`,
    });
};

export const safePhoneSchema = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .regex(indianPhoneRegex, 'Please enter a valid 10-digit Indian mobile number starting with 6-9');

export const safePincodeSchema = z
  .string({ required_error: 'PIN code is required' })
  .trim()
  .regex(indianPincodeRegex, 'Please enter a valid 6-digit Indian PIN code');

// --- AUTHENTICATION & SIGNUP SCHEMAS ---

export const registerCustomerSchema = z.object({
  body: z
    .object({
      email: safeEmailSchema,
      password: safePasswordSchema,
      fullName: safeNameSchema,
      phone: safePhoneSchema,
      gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'Male', 'Female', 'Other']).optional(),
      dob: z
        .string()
        .regex(dateRegex, 'Date of birth must be in YYYY-MM-DD format')
        .optional(),
    })
    .strict(),
});

export const registerProviderSchema = z.object({
  body: z
    .object({
      email: safeEmailSchema,
      password: safePasswordSchema,
      fullName: safeNameSchema,
      phone: safePhoneSchema,
      category: z
        .string({ required_error: 'Category ID is required' })
        .trim()
        .min(1, 'Category ID is required')
        .max(100, 'Category ID cannot exceed 100 characters')
        .refine((val) => !containsHtmlOrScript(val), {
          message: 'Category cannot contain HTML tags or scripts',
        }),
      qualification: safeTextSchema(2, 150, false, 'Qualification').default('Healthcare Professional'),
      experienceYears: z
        .number()
        .min(0, 'Experience years must be positive')
        .max(60, 'Experience years cannot exceed 60')
        .default(1),
      experienceType: z.string().max(50).optional(),
      experienceValue: z.number().min(0).max(60).optional(),
      bio: safeTextSchema(0, 1000, false, 'Bio').optional(),
      chargesPerSession: z
        .number()
        .min(1, 'Charges per session must be at least 1')
        .max(50000, 'Charges per session cannot exceed 50,000')
        .default(500),
      homeVisitAvailable: z.boolean().default(true),
      clinicVisitAvailable: z.boolean().default(false),
      serviceLocations: z
        .array(
          z
            .string()
            .max(100)
            .refine((val) => !containsHtmlOrScript(val), {
              message: 'Service location cannot contain HTML or scripts',
            })
        )
        .max(20)
        .optional(),
      collegeName: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      education: z
        .object({
          collegeName: z.string().max(200).optional(),
          courseName: z.string().max(150).optional(),
          startYear: z.number().min(1950).max(2050).optional(),
          completionYear: z.number().min(1950).max(2050).optional(),
          courseStatus: z.string().max(50).optional(),
          studentIdNumber: z.string().max(100).optional(),
        })
        .optional(),
      degreeDocId: z.string().max(100).optional(),
      studentIdDocId: z.string().max(100).optional(),
      aadhaarDocId: z.string().max(100).optional(),
      panDocId: z.string().max(100).optional(),
      isNurse: z.boolean().optional(),
      nursingDetails: z
        .object({
          qualification: safeTextSchema(0, 150, false, 'Nursing qualification').optional(),
          registrationNumber: safeTextSchema(0, 50, false, 'Nursing registration number').optional(),
          degreeDocId: z.string().max(100).refine((val) => !containsHtmlOrScript(val)).optional(),
          registrationDocId: z.string().max(100).refine((val) => !containsHtmlOrScript(val)).optional(),
        })
        .optional(),
      experienceDetails: z
        .array(
          z.object({
            facilityName: safeTextSchema(0, 150, false, 'Facility name').optional(),
            workplaceName: safeTextSchema(0, 150, false, 'Workplace name').optional(),
            yearsWorked: z.number().min(0).max(60).optional(),
            certificateDocId: z.string().max(100).refine((val) => !containsHtmlOrScript(val)).optional(),
          })
        )
        .max(10)
        .optional(),
      experienceWorkplaces: z.array(z.any()).optional(),
    })
    .passthrough(),
});

export const registerClinicSchema = z.object({
  body: z
    .object({
      email: safeEmailSchema,
      password: safePasswordSchema,
      clinicName: safeTextSchema(2, 150, true, 'Clinic name'),
      ownerContactPerson: safeNameSchema,
      phone: safePhoneSchema,
      addressLine1: safeTextSchema(3, 250, true, 'Address line 1'),
      city: safeTextSchema(1, 100, false, 'City').optional(),
      state: safeTextSchema(1, 100, false, 'State').optional(),
      pincode: safePincodeSchema.optional(),
      description: safeTextSchema(0, 1000, false, 'Description').optional(),
      googleMapsUrl: z
        .string()
        .max(500, 'Google Maps URL cannot exceed 500 characters')
        .refine((val) => !containsHtmlOrScript(val), {
          message: 'URL cannot contain HTML tags or scripts',
        })
        .optional(),
      homeVisitAvailable: z.boolean().default(false),
    })
    .strict(),
});

export const registerLabSchema = z.object({
  body: z
    .object({
      email: safeEmailSchema,
      password: safePasswordSchema,
      phone: safePhoneSchema,
      labName: safeTextSchema(0, 150, false, 'Lab name').optional(),
      diagnosticCenterName: safeTextSchema(0, 150, false, 'Diagnostic center name').optional(),
      contactPerson: safeNameSchema.optional(),
      fullName: safeNameSchema.optional(),
      addressLine1: safeTextSchema(0, 250, false, 'Address line 1').optional(),
      labAddress: safeTextSchema(0, 250, false, 'Lab address').optional(),
      city: safeTextSchema(1, 100, true, 'City'),
      district: safeTextSchema(0, 100, false, 'District').optional(),
      state: safeTextSchema(1, 100, true, 'State'),
      pincode: safePincodeSchema,
      ownerFullName: safeNameSchema.optional(),
      ownerAadhaarDocId: z.string().max(100).refine((val) => !containsHtmlOrScript(val)).optional(),
      ownerPanDocId: z.string().max(100).refine((val) => !containsHtmlOrScript(val)).optional(),
      dmltQualification: safeTextSchema(0, 150, false, 'DMLT qualification').optional(),
      dmltCertNumber: safeTextSchema(0, 50, false, 'DMLT cert number').optional(),
      dmltCertDocId: z.string().max(100).refine((val) => !containsHtmlOrScript(val)).optional(),
      labCertNumber: safeTextSchema(0, 50, false, 'Lab cert number').optional(),
      labCertDocId: z.string().max(100).refine((val) => !containsHtmlOrScript(val)).optional(),
      description: safeTextSchema(0, 1000, false, 'Description').optional(),
      homeSampleCollectionAvailable: z.boolean().default(true),
      labVisitAvailable: z.boolean().default(true),
      homeCollectionFee: z.number().min(0).max(1000).default(150),
    })
    .strict()
    .superRefine((data, ctx) => {
      const effectiveLabName = (data.labName || data.diagnosticCenterName || '').trim();
      if (!effectiveLabName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Lab / Diagnostic Center Name is required',
          path: ['labName'],
        });
      }

      const effectiveContactPerson = (data.contactPerson || data.fullName || '').trim();
      if (!effectiveContactPerson) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Full Name / Contact Person is required',
          path: ['fullName'],
        });
      }

      const effectiveAddress = (data.addressLine1 || data.labAddress || '').trim();
      if (!effectiveAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Lab Address is required',
          path: ['addressLine1'],
        });
      }
    }),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: safeEmailSchema,
      password: z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password is required')
        .max(128, 'Password cannot exceed 128 characters')
        .refine((val) => !val.includes('\0'), {
          message: 'Password cannot contain null bytes',
        }),
    })
    .strict(),
});

export const forgotPasswordSchema = z.object({
  body: z
    .object({
      email: safeEmailSchema,
    })
    .strict(),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z
        .string({ required_error: 'Reset token is required' })
        .trim()
        .min(16, 'Invalid reset token format')
        .max(128, 'Invalid reset token length')
        .refine((val) => !containsHtmlOrScript(val), {
          message: 'Token contains invalid characters',
        }),
      newPassword: safePasswordSchema,
    })
    .strict(),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({ required_error: 'Current password is required' })
        .min(1, 'Current password is required')
        .max(128, 'Password cannot exceed 128 characters')
        .refine((val) => !val.includes('\0'), {
          message: 'Password cannot contain null bytes',
        }),
      newPassword: safePasswordSchema,
    })
    .strict(),
});
