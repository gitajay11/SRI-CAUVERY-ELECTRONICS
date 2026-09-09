/**
 * Enum values re-exported as plain objects and union types.
 *
 * The generated Prisma enums are the source of truth, but importing them into
 * a browser bundle would drag the whole client along. These are structurally
 * identical and safe to use in client components.
 */

export const StaffRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  ORDER_MANAGER: 'ORDER_MANAGER',
  SUPPORT_STAFF: 'SUPPORT_STAFF',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const ProductStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  READY_TO_SHIP: 'READY_TO_SHIP',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURNED: 'RETURNED',
  REFUNDED: 'REFUNDED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  COD_PENDING: 'COD_PENDING',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = { COD: 'COD', ONLINE: 'ONLINE' } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const RefundStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const ReturnStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PICKUP_SCHEDULED: 'PICKUP_SCHEDULED',
  RECEIVED: 'RECEIVED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  CLOSED: 'CLOSED',
} as const;
export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];

export const CouponType = { PERCENT: 'PERCENT', FLAT: 'FLAT' } as const;
export type CouponType = (typeof CouponType)[keyof typeof CouponType];

export const ReviewStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  HIDDEN: 'HIDDEN',
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const StockReason = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  CUSTOMER_RETURN: 'CUSTOMER_RETURN',
  DAMAGED: 'DAMAGED',
  LOST: 'LOST',
  CANCELLED_ORDER: 'CANCELLED_ORDER',
  STOCK_TAKE: 'STOCK_TAKE',
} as const;
export type StockReason = (typeof StockReason)[keyof typeof StockReason];

export const AdminNotificationType = {
  NEW_ORDER: 'NEW_ORDER',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  NEW_CUSTOMER: 'NEW_CUSTOMER',
  NEW_REVIEW: 'NEW_REVIEW',
} as const;
export type AdminNotificationType =
  (typeof AdminNotificationType)[keyof typeof AdminNotificationType];

export const BannerPlacement = {
  HERO: 'HERO',
  PROMO_STRIP: 'PROMO_STRIP',
  CATEGORY_FEATURE: 'CATEGORY_FEATURE',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
} as const;
export type BannerPlacement = (typeof BannerPlacement)[keyof typeof BannerPlacement];

export const AddressType = { HOME: 'HOME', WORK: 'WORK', OTHER: 'OTHER' } as const;
export type AddressType = (typeof AddressType)[keyof typeof AddressType];
