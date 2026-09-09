import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

/**
 * robots.txt
 *
 * The catalogue is open to crawlers; anything personal or transactional is
 * not. Filtered shop URLs are excluded to keep crawl budget on the canonical
 * grid and the product pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/admin/',
          '/account',
          '/account/',
          '/orders',
          '/order/',
          '/cart',
          '/checkout',
          '/wishlist',
          '/signin',
          '/register',
          '/search',
          '/offline.html',
          '/*?*categories=',
          '/*?*brands=',
          '/*?*minPrice=',
          '/*?*page=',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
