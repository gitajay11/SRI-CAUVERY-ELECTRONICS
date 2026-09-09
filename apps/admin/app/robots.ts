import type { MetadataRoute } from 'next';

/**
 * The admin panel must never be indexed. This is belt and braces alongside the
 * `X-Robots-Tag` header and the `robots` metadata — a crawler that ignores one
 * still meets the others.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
