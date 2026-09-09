import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
} from '@tamizh/db/enums';

/**
 * Serialisable view models.
 *
 * Server code converts Prisma rows into these before they cross into client
 * components, so the boundary never carries Date objects or accidental private
 * columns — password hashes, cost prices, internal notes.
 */

export type Locale = 'en' | 'ta';

export interface ProductImageView {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface CategoryView {
  id: string;
  slug: string;
  name: string;
  nameTa: string;
  description: string | null;
  descriptionTa: string | null;
  icon: string | null;
  imageUrl: string | null;
  parentId: string | null;
  productCount?: number;
  children?: CategoryView[];
}

export interface ProductVariantView {
  id: string;
  sku: string;
  name: string;
  /** Paise. Falls back to the parent product price when null. */
  price: number | null;
  stock: number;
  attributes: Record<string, string>;
}

/** Trimmed shape used by grids, carousels and search results. */
export interface ProductCardView {
  id: string;
  slug: string;
  sku: string;
  name: string;
  nameTa: string | null;
  brand: string;
  /** Paise. */
  price: number;
  /** Paise. */
  mrp: number;
  discountPercent: number;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  image: ProductImageView | null;
  categorySlug: string;
  categoryName: string;
  isFeatured: boolean;
}

export interface ReviewView {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  authorName: string;
  reply: string | null;
  createdAt: string;
}

/** Full detail shape for the product page. */
export interface ProductDetailView extends ProductCardView {
  description: string;
  descriptionTa: string | null;
  tags: string[];
  specs: Record<string, string>;
  soldCount: number;
  images: ProductImageView[];
  variants: ProductVariantView[];
  category: CategoryView;
  reviews: ReviewView[];
  createdAt: string;
}

export type SortKey =
  | 'relevance'
  | 'price-asc'
  | 'price-desc'
  | 'newest'
  | 'best-selling'
  | 'rating';

export const SORT_KEYS: SortKey[] = [
  'relevance',
  'price-asc',
  'price-desc',
  'newest',
  'best-selling',
  'rating',
];

export interface ProductQuery {
  q?: string;
  category?: string;
  categories?: string[];
  brands?: string[];
  /** Paise. */
  minPrice?: number;
  /** Paise. */
  maxPrice?: number;
  minRating?: number;
  minDiscount?: number;
  inStockOnly?: boolean;
  featured?: boolean;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface FacetValue {
  value: string;
  label: string;
  labelTa?: string;
  count: number;
}

export interface ProductFacets {
  categories: FacetValue[];
  brands: FacetValue[];
  /** Paise. */
  priceMin: number;
  /** Paise. */
  priceMax: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductSearchResult extends Paginated<ProductCardView> {
  facets: ProductFacets;
}

// ---------------------------------------------------------------------------
// Cart and orders
// ---------------------------------------------------------------------------

export interface CartItemView {
  id: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  nameTa: string | null;
  variantName: string | null;
  sku: string;
  image: ProductImageView | null;
  /** Paise, resolved server-side from the current catalogue price. */
  unitPrice: number;
  /** Paise. */
  mrp: number;
  quantity: number;
  /** Units currently available; the quantity stepper clamps to this. */
  availableStock: number;
  lineTotal: number;
}

export interface CartTotals {
  /** Sum of line totals at selling price (paise). */
  subtotal: number;
  /** Total struck-through value, i.e. sum of MRP × qty (paise). */
  mrpTotal: number;
  /** mrpTotal − subtotal (paise). */
  productDiscount: number;
  /** Extra discount from an applied coupon (paise). */
  couponDiscount: number;
  /** Paise. Zero above the free-delivery threshold. */
  shippingFee: number;
  /** Amount payable (paise). */
  total: number;
  /** Paise the shopper still needs to add for free delivery, 0 when reached. */
  freeShippingRemaining: number;
}

export interface AppliedCoupon {
  code: string;
  description: string;
  discount: number;
}

export interface CartView {
  items: CartItemView[];
  totals: CartTotals;
  coupon: AppliedCoupon | null;
  itemCount: number;
  /** Lines auto-adjusted because stock ran out since they were added. */
  notices: string[];
}

export interface AddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

export interface AddressView extends AddressInput {
  id: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  isDefault: boolean;
}

export interface OrderItemView {
  id: string;
  productId: string | null;
  slug: string | null;
  name: string;
  nameTa: string | null;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  mrp: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  placedAt: string;
  deliveredAt: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  state: string;
  pincode: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  trackingNumber: string | null;
  cancelReason: string | null;
  notes: string | null;
  items: OrderItemView[];
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
}

export type { OrderStatus, PaymentMethod, PaymentStatus, ProductStatus };
