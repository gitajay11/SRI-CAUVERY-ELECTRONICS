/**
 * Links into the app, in the website's own address shapes.
 *
 * A link may arrive as `sricauvery://product/x`, as a website URL (once App
 * Links / Universal Links are set up for the shop's domain), or as a bare
 * path. Where the website and the app name a page differently, the website's
 * address is translated, so any link a shopper was sent — in WhatsApp, an
 * email, a notification — opens the same page in the app.
 *
 *   /categories/:slug   → /products?category=:slug
 *   /categories, /shop  → the Shop tab, or a listing when /shop carries filters
 *   /search?q=…         → /products?q=…
 *
 * Product, order, orders, cart, wishlist, account, sign-in and checkout
 * addresses are the same in both. Anything else falls through to the app's
 * "page not found".
 */

const SCHEME = 'sricauvery://';
const LISTING_FILTERS = ['q', 'category', 'sort', 'featured'];

function toUrl(path: string): URL {
  if (path.startsWith(SCHEME)) return new URL(`/${path.slice(SCHEME.length)}`, 'https://app.local');
  if (/^https?:\/\//i.test(path)) return new URL(path);
  return new URL(path.startsWith('/') ? path : `/${path}`, 'https://app.local');
}

function listing(params: URLSearchParams): string {
  const kept = new URLSearchParams();
  for (const key of LISTING_FILTERS) {
    const value = params.get(key);
    if (value) kept.set(key, value);
  }
  const query = kept.toString();
  return query ? `/products?${query}` : '/shop';
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = toUrl(path);
    const segments = url.pathname.split('/').filter(Boolean);
    const [first, second] = segments;

    if (first === 'categories') {
      return second ? `/products?category=${encodeURIComponent(second)}` : '/shop';
    }
    if (first === 'shop') return listing(url.searchParams);
    if (first === 'search') {
      const q = url.searchParams.get('q');
      return q ? `/products?q=${encodeURIComponent(q)}` : '/search';
    }

    return `${url.pathname}${url.search}` || '/';
  } catch {
    // A link that is not a link: the home page is a better answer than a crash.
    return '/';
  }
}
