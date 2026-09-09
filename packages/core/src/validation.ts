import { z } from 'zod';

/**
 * Validation primitives shared by both applications.
 *
 * Application-specific request schemas live in each app; what belongs here is
 * the shape of Indian contact details and money, so a phone number is accepted
 * or rejected identically at checkout and in the admin.
 */

/** Indian mobile numbers: 10 digits starting 6–9, optionally +91 prefixed. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'));

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email address is required')
  .max(200)
  .email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200, 'Password is too long');

/**
 * Staff passwords are held to a higher bar than customer passwords: an admin
 * account can move money and change prices.
 */
export const staffPasswordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(200, 'Password is too long')
  .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value), {
    message: 'Include both upper and lower case letters',
  })
  .refine((value) => /\d/.test(value), { message: 'Include at least one number' });

export const cuidSchema = z.string().min(1).max(64);

export const nonEmpty = (max: number, label: string) =>
  z.string().trim().min(1, `${label} is required`).max(max);

/** Rupees typed by a human, stored as paise. */
export const rupeesSchema = z.coerce
  .number()
  .min(0, 'Cannot be negative')
  .max(10_000_000, 'That is larger than the shop allows')
  .transform((rupees) => Math.round(rupees * 100));

/** A percentage typed by a human (12.5), stored as basis points (1250). */
export const percentSchema = z.coerce
  .number()
  .min(0)
  .max(100)
  .transform((percent) => Math.round(percent * 100));

export const addressSchema = z.object({
  fullName: nonEmpty(100, 'Name'),
  phone: phoneSchema,
  line1: nonEmpty(200, 'Address'),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: nonEmpty(80, 'City'),
  district: nonEmpty(80, 'District'),
  state: nonEmpty(80, 'State'),
  pincode: pincodeSchema,
});

/** Page/limit for any list endpoint. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export type Pagination = z.infer<typeof paginationSchema>;
