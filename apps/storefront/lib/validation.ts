import { z } from 'zod';

/**
 * Every request body and query string is parsed through one of these schemas
 * before it reaches a service. Nothing from the browser is trusted: prices,
 * totals and stock are always recomputed on the server from the catalogue.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

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

export const cuidSchema = z.string().min(1).max(64);

const nonEmpty = (max: number, label: string) =>
  z.string().trim().min(1, `${label} is required`).max(max);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: nonEmpty(100, 'Name'),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(200),
});

export const profileSchema = z.object({
  name: nonEmpty(100, 'Name'),
  phone: phoneSchema.optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export const addressSchema = z.object({
  fullName: nonEmpty(100, 'Name'),
  phone: phoneSchema,
  line1: nonEmpty(200, 'Address'),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: nonEmpty(80, 'City'),
  district: nonEmpty(80, 'District'),
  state: nonEmpty(80, 'State'),
  pincode: pincodeSchema,
  label: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  isDefault: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export const addToCartSchema = z.object({
  productId: cuidSchema,
  variantId: cuidSchema.nullish(),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const updateCartItemSchema = z.object({
  itemId: cuidSchema,
  /** Zero removes the line. */
  quantity: z.coerce.number().int().min(0).max(99),
});

export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, 'Enter a coupon code')
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, 'Coupon codes contain letters and numbers only'),
});

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export const checkoutSchema = z.object({
  customerName: nonEmpty(100, 'Name'),
  customerEmail: emailSchema,
  customerPhone: phoneSchema,
  addressLine1: nonEmpty(200, 'Address'),
  addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
  city: nonEmpty(80, 'City'),
  district: nonEmpty(80, 'District'),
  state: nonEmpty(80, 'State'),
  pincode: pincodeSchema,
  paymentMethod: z.enum(['COD', 'ONLINE']),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  couponCode: z.string().trim().toUpperCase().max(32).optional().or(z.literal('')),
  saveAddress: z.boolean().optional().default(false),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Tell us briefly why').max(300),
});

/**
 * A return request.
 *
 * Only which items and how many — never a refund amount. What the return is
 * worth is worked out from the order's own recorded prices.
 */
export const returnRequestSchema = z.object({
  reason: z.string().trim().min(3, 'Tell us briefly why').max(300),
  comment: z.string().trim().max(600).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1).max(64),
        quantity: z.coerce.number().int().min(1).max(999),
      }),
    )
    .min(1, 'Choose at least one item')
    .max(50),
});

// ---------------------------------------------------------------------------
// Reviews & contact
// ---------------------------------------------------------------------------

export const reviewSchema = z.object({
  productId: cuidSchema,
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal('')),
  comment: z.string().trim().min(10, 'Please write at least 10 characters').max(2000),
});

export const contactSchema = z.object({
  name: nonEmpty(100, 'Name'),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  subject: nonEmpty(150, 'Subject'),
  message: z.string().trim().min(10, 'Please write at least 10 characters').max(2000),
});

// ---------------------------------------------------------------------------
// Catalogue queries
// ---------------------------------------------------------------------------

const csv = () =>
  z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .slice(0, 20)
        : undefined,
    );

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  categories: csv(),
  brands: csv(),
  /** Rupees in the URL, converted to paise by the caller. */
  minPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minDiscount: z.coerce.number().int().min(0).max(90).optional(),
  inStock: z
    .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .optional()
    .transform((value) => value === '1' || value === 'true'),
  sort: z
    .enum(['relevance', 'price-asc', 'price-desc', 'newest', 'best-selling', 'rating'])
    .optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, 'SKU is required')
    .max(40)
    .regex(/^[A-Z0-9-]+$/, 'SKU may contain letters, numbers and dashes'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(90)
    .regex(/^[a-z0-9-]+$/, 'Slug may contain lowercase letters, numbers and dashes'),
  name: nonEmpty(160, 'Product name'),
  nameTa: z.string().trim().max(200).optional().or(z.literal('')),
  description: z.string().trim().min(20, 'Write at least 20 characters').max(5000),
  descriptionTa: z.string().trim().max(5000).optional().or(z.literal('')),
  brand: nonEmpty(80, 'Brand'),
  categoryId: cuidSchema,
  /** Rupees, converted to paise before persisting. */
  price: z.coerce.number().min(1, 'Price must be above zero').max(1_000_000),
  mrp: z.coerce.number().min(1, 'MRP must be above zero').max(1_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  specs: z.record(z.string().max(60), z.string().max(300)).default({}),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1).max(500),
        alt: z.string().trim().max(200).default(''),
      }),
    )
    .max(8)
    .default([]),
});

export type AdminProductInput = z.infer<typeof adminProductSchema>;

export const adminOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
    'REFUNDED',
  ]),
  paymentStatus: z
    .enum(['PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'COD_PENDING'])
    .optional(),
  trackingNumber: z.string().trim().max(80).optional().or(z.literal('')),
  note: z.string().trim().max(300).optional().or(z.literal('')),
});

export const adminStockSchema = z.object({
  stock: z.coerce.number().int().min(0).max(1_000_000),
});

/**
 * Flattens a ZodError into `{ field: message }` for form rendering.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
