import type { NextConfig } from 'next';
import { loadWorkspaceEnv } from '@tamizh/core/load-env';

// The database URL lives at the workspace root and is shared with the admin
// app, so load it before anything reads process.env.
loadWorkspaceEnv(import.meta.dirname);

/**
 * Security headers applied to every response.
 *
 * The CSP is deliberately strict: the storefront ships no third-party scripts.
 * `'unsafe-inline'` is required for Next's inline bootstrap/flight payloads and
 * for the JSON-LD blocks; `'unsafe-eval'` is only allowed in development for
 * React Refresh.
 */
/**
 * Razorpay Checkout needs four separate permissions, and it fails at the
 * first: the script is fetched from checkout.razorpay.com, the modal itself
 * is an iframe, and the widget talks to Razorpay's API and telemetry hosts
 * while the shopper is paying.
 *
 * Listed as named hosts rather than a wildcard, and unconditionally rather
 * than only when PAYMENT_PROVIDER says razorpay — a CSP assembled from
 * build-time environment is exactly the kind of thing that silently differs
 * between a build and the deployment it lands in.
 */
const RAZORPAY = {
  script: 'https://checkout.razorpay.com https://cdn.razorpay.com',
  frame: 'https://api.razorpay.com https://checkout.razorpay.com',
  connect:
    'https://api.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com',
  img: 'https://cdn.razorpay.com https://*.rzp.io',
};

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${RAZORPAY.script}${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com ${RAZORPAY.img}`,
  `connect-src 'self' ${RAZORPAY.connect}`,
  // The payment modal is an iframe. Without this the script loads and then
  // opens nothing, which looks like a hang rather than a blocked frame.
  `frame-src 'self' ${RAZORPAY.frame}`,
  "form-action 'self'",
  // Still nobody may frame the shop; this governs what the shop may frame.
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 200, 256, 320, 384],
    /**
     * Product images uploaded from the admin live in Vercel Blob, and
     * `next/image` refuses any host it has not been told about — a good
     * default, since the optimiser would otherwise fetch and cache whatever
     * URL a database row happened to contain.
     *
     * The hostname is a per-store subdomain of blob.vercel-storage.com, so the
     * wildcard covers whichever store this project is connected to without
     * pinning the config to one account.
     */
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },

  experimental: {
    optimizePackageImports: ['@/components'],
  },

  // Workspace packages ship TypeScript source, so Next has to compile them.
  transpilePackages: ['@tamizh/core', '@tamizh/db'],

  // The generated Prisma client and the pg driver are server-only.
  serverExternalPackages: ['@prisma/client', 'pg'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // The service worker must never be cached by the CDN/browser, or
        // shoppers get stuck on an old app shell after a deploy.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
