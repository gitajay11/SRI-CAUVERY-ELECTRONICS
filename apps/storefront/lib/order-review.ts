import type { CartTotals, ProductImageView } from '@tamizh/core/types';

/**
 * The order review: what the server says the order will be, shown to the
 * shopper before anything is created.
 *
 * Shared by the review endpoint and the checkout's review sheet, so both read
 * the same shape. Every number in it comes from the server.
 */

/** A cart line as the shopper last saw it, so the server can say what moved. */
export interface SeenLine {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
}

export type LineChange =
  | { type: 'price'; previousUnitPrice: number }
  | { type: 'quantity'; previousQuantity: number };

export interface ReviewLine {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  nameTa: string | null;
  variantName: string | null;
  image: ProductImageView | null;
  quantity: number;
  /** Paise. */
  unitPrice: number;
  /** Paise. */
  lineTotal: number;
  /** Set when this line differs from what the shopper last saw. */
  changes: LineChange[];
}

export interface OrderReview {
  lines: ReviewLine[];
  /** Lines the shopper saw that are no longer available at all. */
  removed: { productId: string; variantId: string | null }[];
  totals: CartTotals;
  coupon: { code: string; discount: number } | null;
  address: {
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    district: string;
    state: string;
    pincode: string;
  };
  /** Delivery window as calendar dates (YYYY-MM-DD, India), when the zone says. */
  delivery: { earliest: string; latest: string } | null;
  /** True when anything above differs from what the shopper last saw. */
  changed: boolean;
  /**
   * Identifies exactly this order: its lines, prices and total. Confirming
   * sends it back, and the server refuses if the order it would now place
   * is not the one that was reviewed.
   */
  fingerprint: string;
}

export function lineKey(line: { productId: string; variantId: string | null }): string {
  return `${line.productId}:${line.variantId ?? ''}`;
}
