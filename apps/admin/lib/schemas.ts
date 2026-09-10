import { z } from 'zod';
import { nonEmpty, percentSchema, rupeesSchema } from '@tamizh/core/validation';

/**
 * Request schemas for the admin API.
 *
 * Money arrives from the browser in rupees, as a person typed it, and is
 * converted to paise here — one place, so no handler can forget. Percentages
 * become basis points the same way.
 *
 * Nothing derived is accepted from the client: not totals, not discounts, not
 * stock counts. Those are computed server-side from what is stored.
 */

export const productInputSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, 'SKU is required')
      .max(40)
      .regex(/^[A-Z0-9-]+$/, 'Letters, numbers and dashes only'),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(90)
      .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
    name: nonEmpty(160, 'Product name'),
    nameTa: z.string().trim().max(200).optional().or(z.literal('')),
    description: z.string().trim().min(20, 'Write at least 20 characters').max(5000),
    descriptionTa: z.string().trim().max(5000).optional().or(z.literal('')),
    brand: nonEmpty(80, 'Brand'),
    categoryId: z.string().min(1, 'Choose a category').max(64),

    mrp: rupeesSchema,
    price: rupeesSchema,
    costPrice: rupeesSchema,
    taxBps: percentSchema,

    stock: z.coerce.number().int().min(0).max(1_000_000),
    lowStockThreshold: z.coerce.number().int().min(0).max(100_000),

    weightGrams: z.coerce.number().int().min(0).max(1_000_000).nullish(),
    lengthMm: z.coerce.number().int().min(0).max(100_000).nullish(),
    widthMm: z.coerce.number().int().min(0).max(100_000).nullish(),
    heightMm: z.coerce.number().int().min(0).max(100_000).nullish(),

    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
    isFeatured: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),

    tags: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
    specs: z.record(z.string().max(60), z.string().max(300)).default({}),
    images: z
      .array(
        z.object({
          url: z.string().trim().min(1).max(500),
          alt: z.string().trim().max(200).default(''),
        }),
      )
      .max(10)
      .default([]),
  })
  .refine((input) => input.price <= input.mrp, {
    message: 'The selling price cannot be above the M.R.P.',
    path: ['price'],
  });

export type ProductInputBody = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
  name: nonEmpty(80, 'Name'),
  nameTa: nonEmpty(120, 'Tamil name'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  descriptionTa: z.string().trim().max(500).optional().or(z.literal('')),
  icon: z.string().trim().max(40).optional().or(z.literal('')),
  imageUrl: z.string().trim().max(500).optional().or(z.literal('')),
  parentId: z.string().max(64).nullish(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(32)
      .regex(/^[A-Z0-9_-]+$/, 'Letters, numbers, dashes and underscores only'),
    description: nonEmpty(200, 'Description'),
    type: z.enum(['PERCENT', 'FLAT', 'FREE_SHIPPING']),
    /** Percent coupons carry basis points; flat ones carry paise. */
    percentValue: percentSchema.optional(),
    flatValue: rupeesSchema.optional(),
    minOrder: rupeesSchema.default(0),
    maxDiscount: rupeesSchema.nullish(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional().nullable(),
    usageLimit: z.coerce.number().int().min(1).max(1_000_000).nullish(),
    perUserLimit: z.coerce.number().int().min(1).max(1000).nullish(),
    isActive: z.boolean().default(true),
    categoryIds: z.array(z.string().max(64)).max(50).default([]),
    productIds: z.array(z.string().max(64)).max(200).default([]),
  })
  .refine(
    (input) => {
      // A shipping waiver has no amount to enter — the saving is whatever
      // delivery would have cost on that particular order.
      if (input.type === 'FREE_SHIPPING') return true;
      return input.type === 'PERCENT'
        ? input.percentValue !== undefined
        : input.flatValue !== undefined;
    },
    { message: 'Enter a discount value', path: ['percentValue'] },
  );

export const settingsInputSchema = z.object({
  nameEn: nonEmpty(120, 'Shop name'),
  nameTa: nonEmpty(160, 'Tamil shop name'),
  email: z.string().trim().email('Enter a valid email address').max(200),
  phone: nonEmpty(30, 'Phone'),
  whatsapp: z.string().trim().max(20).optional().or(z.literal('')),
  addressLine1: nonEmpty(200, 'Address'),
  addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
  city: nonEmpty(80, 'City'),
  district: nonEmpty(80, 'District'),
  state: nonEmpty(80, 'State'),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  gstin: z.string().trim().max(20).optional().or(z.literal('')),
  defaultTaxBps: percentSchema,
  pricesIncludeTax: z.boolean(),
  freeShippingThreshold: rupeesSchema,
  standardShippingFee: rupeesSchema,
  minimumOrderValue: rupeesSchema,
  returnWindowDays: z.coerce.number().int().min(0).max(90),
  lowStockNotifyThreshold: z.coerce.number().int().min(0).max(10_000),
  emailNotificationsEnabled: z.boolean(),
  pushNotificationsEnabled: z.boolean(),
});

export const staffInputSchema = z.object({
  name: nonEmpty(100, 'Name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(200),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  role: z.enum([
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'INVENTORY_MANAGER',
    'ORDER_MANAGER',
    'SUPPORT_STAFF',
  ]),
  isActive: z.boolean().default(true),
  permissionOverrides: z
    .object({
      allow: z.array(z.string().max(60)).max(60).default([]),
      deny: z.array(z.string().max(60)).max(60).default([]),
    })
    .default({ allow: [], deny: [] }),
});

export const bannerInputSchema = z.object({
  placement: z.enum(['HERO', 'PROMO_STRIP', 'CATEGORY_FEATURE', 'ANNOUNCEMENT']),
  title: nonEmpty(160, 'Headline'),
  titleTa: z.string().trim().max(200).optional().or(z.literal('')),
  subtitle: z.string().trim().max(300).optional().or(z.literal('')),
  subtitleTa: z.string().trim().max(300).optional().or(z.literal('')),
  imageUrl: z.string().trim().max(500).optional().or(z.literal('')),
  ctaLabel: z.string().trim().max(60).optional().or(z.literal('')),
  ctaLabelTa: z.string().trim().max(80).optional().or(z.literal('')),
  ctaHref: z.string().trim().max(300).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
});

export const shippingZoneSchema = z.object({
  name: nonEmpty(80, 'Zone name'),
  pincodePrefixes: z.array(z.string().trim().regex(/^\d{1,6}$/)).max(200).default([]),
  shippingFee: rupeesSchema.nullish(),
  minDeliveryDays: z.coerce.number().int().min(0).max(60),
  maxDeliveryDays: z.coerce.number().int().min(0).max(90),
  codAvailable: z.boolean().default(true),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});
