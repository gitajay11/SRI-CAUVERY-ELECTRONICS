import type { NextConfig } from 'next';
import { loadWorkspaceEnv } from '@tamizh/core/load-env';

// Shared configuration (database URL and friends) lives at the workspace root.
loadWorkspaceEnv(import.meta.dirname);

/**
 * Security headers.
 *
 * These are deliberately stricter than the storefront's. The admin panel is an
 * internal tool: it should never be framed, never be indexed, never send a
 * referrer anywhere, and never be reachable by a browser feature it does not
 * use. `connect-src 'self'` also means a compromised dependency cannot quietly
 * exfiltrate order data to another host.
 */
/**
 * Product photography is served by the storefront, which normally sits on a
 * sibling domain. The panel is allowed to display those images and nothing
 * else from there — no scripts, no styles, no fetches.
 */
const shopOrigin = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // `blob:` is the URI scheme for object URLs. Vercel Blob is a different
  // thing entirely and needs its own host, or the browser silently refuses
  // to paint every uploaded product image.
  `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com ${shopOrigin}`,
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // An admin URL can carry an order number; never leak it to another origin.
  { key: 'Referrer-Policy', value: 'no-referrer' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Belt and braces alongside the robots route: this panel must never appear
  // in a search index, whatever a crawler decides to do with robots.txt.
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  transpilePackages: ['@tamizh/core', '@tamizh/db'],
  serverExternalPackages: ['@prisma/client', 'pg'],

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 828, 1080, 1280, 1600],
    imageSizes: [48, 64, 96, 128, 200, 256],
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // The worker must never be cached, or staff get stuck on an old shell.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
