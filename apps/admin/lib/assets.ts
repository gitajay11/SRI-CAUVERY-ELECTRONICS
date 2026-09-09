/**
 * Product photography lives with the shop, not with the panel.
 *
 * Images are stored once, under the storefront's public folder, and referenced
 * by a root-relative path (`/products/kettle-1.png`, `/uploads/…`). That path
 * resolves on the shop's own origin; from the admin panel, which runs on a
 * different host, it has to be made absolute.
 *
 * Doing it here — rather than storing absolute URLs — keeps the database free
 * of environment-specific hostnames, so the same row is correct in
 * development, staging and production.
 */

const SHOP_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

export function assetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${SHOP_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export { SHOP_ORIGIN };
