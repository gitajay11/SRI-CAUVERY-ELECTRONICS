import 'server-only';
import { after } from 'next/server';
import { internalNotifySecret, storefrontUrl } from '@/lib/env';

/**
 * Tells the shop that its catalogue has changed.
 *
 * The storefront remembers its catalogue reads between requests, so a
 * product saved here would otherwise show its old self to shoppers for up
 * to a minute. This asks it to forget, over the same shared secret the
 * staff alerts use, once the response that made the change has gone out —
 * the save must never wait on the shop, and must never fail because the
 * shop was slow. A missed call costs a minute of staleness, nothing more.
 */
export function refreshStorefrontCatalog(): void {
  after(async () => {
    const secret = internalNotifySecret();
    if (!secret) return;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${storefrontUrl()}/api/internal/revalidate`, {
        method: 'POST',
        headers: { 'x-internal-secret': secret },
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (!response.ok) {
        console.warn(`[storefront-cache] revalidate answered ${response.status}`);
      }
    } catch (error) {
      console.warn('[storefront-cache] could not reach the shop', error);
    }
  });
}
