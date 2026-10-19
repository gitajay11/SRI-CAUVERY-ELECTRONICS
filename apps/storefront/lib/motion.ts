/**
 * The navigation side of the motion system: which way a page change goes,
 * and which element, if any, carries across it.
 */

// ---------------------------------------------------------------------------
// Direction
// ---------------------------------------------------------------------------

export type NavDirection = 'forward' | 'back' | 'tab' | 'fade';

/** The bottom bar's destinations: switching between them is not "deeper". */
const TAB_ROOTS = new Set(['/', '/categories', '/wishlist', '/cart', '/account']);

/**
 * How deep a page sits in the shop: home, then sections, then a category,
 * then a product. Checkout sits under the cart and an order under checkout,
 * so cart → checkout → order all read as going deeper.
 */
export function routeRank(pathname: string): number {
  if (pathname === '/') return 0;
  if (pathname.startsWith('/product/') || pathname.startsWith('/order/')) return 3;
  if (pathname.startsWith('/categories/') || pathname === '/checkout') return 2;
  return 1;
}

export function navDirection(from: string, to: string): NavDirection {
  if (from === to) return 'fade';
  if (TAB_ROOTS.has(from) && TAB_ROOTS.has(to)) return 'tab';
  const delta = routeRank(to) - routeRank(from);
  if (delta > 0) return 'forward';
  if (delta < 0) return 'back';
  // Product to product, category to category: another of the same thing,
  // reached from the one before — onwards, not back.
  return routeRank(to) >= 2 ? 'forward' : 'fade';
}

// ---------------------------------------------------------------------------
// Shared elements
// ---------------------------------------------------------------------------

/** The names that pair a listing element with its destination. */
export const productImageName = (productId: string) => `product-image-${productId}`;
export const categoryTileName = (slug: string) => `category-${slug}`;
