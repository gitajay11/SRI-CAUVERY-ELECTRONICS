import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import type { Repository } from './types';

/**
 * The catalogue, remembered between requests.
 *
 * Every page reads the same things — the category tree, the home page's
 * rows, a product and its neighbours — and until now read them from the
 * database on every visit. The database is in Singapore and the function
 * that renders the page was not, so each of those reads was a trip across
 * an ocean before a single byte of HTML could go out.
 *
 * The reads that are the same for everyone are cached here, in the
 * platform's data cache, for a minute — and dropped the moment the shop
 * changes them, from the admin panel or from an order taking stock. What a
 * shopper sees is theirs alone (their cart, their wishlist, their orders)
 * and is never cached; and the cart and checkout re-read stock live, so a
 * product page a minute stale can show "in stock" but can never sell what
 * is not there.
 */

/** Every cached catalogue read carries this tag; invalidating it empties all. */
export const CATALOG_TAG = 'catalog';

/** The ceiling on staleness if an invalidation never arrives. */
const REVALIDATE_SECONDS = 60;

/** The reads that depend only on the catalogue, never on who is asking. */
const CATALOG_READS = [
  'listCategoryTree',
  'listCategoriesFlat',
  'getCategoryBySlug',
  'searchProducts',
  'getProductBySlug',
  'getProductsByIds',
  'listFeatured',
  'listBestSellers',
  'listNewArrivals',
  'listByCategorySlug',
  'listBestOffers',
  'listRelated',
  'suggest',
  'listBrands',
] as const satisfies readonly (keyof Repository)[];

type CatalogRead = (typeof CATALOG_READS)[number];

export function withCatalogCache(inner: Repository): Repository {
  const cached = new Map<CatalogRead, (...args: unknown[]) => Promise<unknown>>();

  for (const name of CATALOG_READS) {
    const read = inner[name] as (...args: unknown[]) => Promise<unknown>;
    // The arguments become part of the key, so a search for "cable" and a
    // search for "bulb" are two entries, and page two is not page one.
    cached.set(
      name,
      unstable_cache((...args: unknown[]) => read.apply(inner, args), [CATALOG_TAG, name], {
        tags: [CATALOG_TAG],
        revalidate: REVALIDATE_SECONDS,
      }),
    );
  }

  return new Proxy(inner, {
    get(target, property, receiver) {
      const hit = typeof property === 'string' ? cached.get(property as CatalogRead) : undefined;
      return hit ?? Reflect.get(target, property, receiver);
    },
  });
}

/**
 * Forgets every cached catalogue read.
 *
 * Called after anything that changes what a product page or a listing
 * shows: an order taking stock, a review changing a rating, and — through
 * the internal revalidate endpoint — every catalogue edit made in the admin
 * panel.
 */
export function forgetCatalog(): void {
  // Expire, rather than serve stale while refreshing: whoever just changed
  // a product in the panel, or just bought the last one, should see it on
  // their next load, not the one after.
  revalidateTag(CATALOG_TAG, { expire: 0 });
}
