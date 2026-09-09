import type {
  AddressInput,
  AddressView,
  CartItemView,
  CategoryView,
  OrderView,
  PaymentMethod,
  PaymentStatus,
  ProductCardView,
  ProductDetailView,
  ProductQuery,
  ProductSearchResult,
} from '@tamizh/core/types';
import type { CouponRule } from '@tamizh/core/pricing';

/**
 * The data-access contract for the whole application.
 *
 * Route handlers and server components depend on this interface, never on
 * Prisma directly. That keeps SQL out of the UI layer and lets the app boot
 * against the in-memory demo catalogue when no database is configured.
 */

/** Identifies whose cart/wishlist to act on. */
export type CartOwner = { userId: string } | { anonymousId: string };

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ReturnRequestInput {
  reason: string;
  comment?: string;
  /** Order item ids and how many of each are going back. */
  items: { orderItemId: string; quantity: number }[];
}

/**
 * Whether an order can still be returned, and what of it.
 *
 * `returnable` lists only what has not already been sent back, so the form
 * cannot offer a unit twice.
 */
export interface ReturnEligibility {
  windowDays: number;
  pending: boolean;
  returnable: { id: string; name: string; nameTa: string | null; quantity: number; unitPrice: number }[];
}

export interface CreateUserInput {
  email: string;
  name: string;
  phone?: string | null;
  passwordHash: string;
}

/** A cart line with the catalogue data already resolved and stock checked. */
export interface ResolvedCart {
  items: CartItemView[];
  /** Lines auto-corrected because stock fell below the saved quantity. */
  notices: string[];
}

export interface PlaceOrderInput {
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  coupon: { id: string; code: string; discount: number } | null;
  items: CartItemView[];
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  orderNumber: string;
  paymentProvider: string;
}

export interface Repository {
  // -- catalogue ----------------------------------------------------------
  listCategoryTree(): Promise<CategoryView[]>;
  listCategoriesFlat(): Promise<CategoryView[]>;
  getCategoryBySlug(slug: string): Promise<CategoryView | null>;
  searchProducts(query: ProductQuery): Promise<ProductSearchResult>;
  getProductBySlug(slug: string): Promise<ProductDetailView | null>;
  getProductsByIds(ids: string[]): Promise<ProductCardView[]>;
  listFeatured(limit: number): Promise<ProductCardView[]>;
  listBestSellers(limit: number): Promise<ProductCardView[]>;
  listNewArrivals(limit: number): Promise<ProductCardView[]>;
  listByCategorySlug(slug: string, limit: number): Promise<ProductCardView[]>;
  listBestOffers(limit: number): Promise<ProductCardView[]>;
  listRelated(productId: string, limit: number): Promise<ProductCardView[]>;
  suggest(term: string, limit: number): Promise<ProductCardView[]>;
  listBrands(): Promise<string[]>;

  // -- users --------------------------------------------------------------
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  updateUserProfile(
    id: string,
    data: { name: string; phone: string | null },
  ): Promise<UserRecord>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;

  // -- addresses ----------------------------------------------------------
  listAddresses(userId: string): Promise<AddressView[]>;
  createAddress(
    userId: string,
    input: AddressInput & { label?: 'HOME' | 'WORK' | 'OTHER'; isDefault?: boolean },
  ): Promise<AddressView>;
  deleteAddress(userId: string, addressId: string): Promise<void>;
  setDefaultAddress(userId: string, addressId: string): Promise<void>;

  // -- cart ---------------------------------------------------------------
  getCart(owner: CartOwner): Promise<ResolvedCart>;
  addToCart(
    owner: CartOwner,
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<void>;
  setCartItemQuantity(
    owner: CartOwner,
    itemId: string,
    quantity: number,
  ): Promise<void>;
  clearCart(owner: CartOwner): Promise<void>;
  /** Folds a guest cart into the user's cart after sign-in. */
  mergeCarts(anonymousId: string, userId: string): Promise<void>;

  // -- wishlist -----------------------------------------------------------
  listWishlist(userId: string): Promise<ProductCardView[]>;
  listWishlistIds(userId: string): Promise<string[]>;
  toggleWishlist(userId: string, productId: string): Promise<{ inWishlist: boolean }>;

  // -- coupons ------------------------------------------------------------
  findCoupon(code: string): Promise<CouponRule | null>;

  // -- orders -------------------------------------------------------------
  placeOrder(input: PlaceOrderInput): Promise<OrderView>;
  listOrdersForUser(userId: string): Promise<OrderView[]>;
  getOrderForUser(userId: string, orderNumber: string): Promise<OrderView | null>;
  /** Guest lookup right after checkout, guarded by the email on the order. */
  getOrderByNumberAndEmail(
    orderNumber: string,
    email: string,
  ): Promise<OrderView | null>;
  cancelOrder(userId: string, orderNumber: string, reason: string): Promise<OrderView>;
  requestReturn(
    userId: string,
    orderNumber: string,
    input: ReturnRequestInput,
  ): Promise<{ returnNumber: string; orderNumber: string; lines: number }>;
  returnEligibility(
    userId: string,
    orderNumber: string,
  ): Promise<ReturnEligibility | null>;

  // -- reviews ------------------------------------------------------------
  hasPurchased(userId: string, productId: string): Promise<boolean>;
  upsertReview(
    userId: string,
    authorName: string,
    input: { productId: string; rating: number; title?: string; comment: string },
  ): Promise<void>;
}
