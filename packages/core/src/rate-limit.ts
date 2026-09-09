import { AppError } from './api.ts';

/**
 * In-process fixed-window rate limiter.
 *
 * It protects the endpoints that are cheap to abuse — sign-in, registration,
 * coupon checks, contact form — from a single machine hammering them. On a
 * multi-instance deployment this becomes per-instance; swap the Map for Redis
 * behind the same `consume()` signature when you scale out.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number): void {
  // Cheap amortised cleanup so the map cannot grow without bound.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** Requests allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * Records a hit. Throws a 429 AppError once the caller exceeds the limit.
 *
 * @param key A stable identifier, e.g. `login:203.0.113.9`.
 */
export function consume(key: string, options: RateLimitOptions): void {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > options.limit) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000);
    throw new AppError(
      `Too many attempts. Please try again in ${seconds} second${seconds === 1 ? '' : 's'}.`,
      429,
      'rate_limited',
    );
  }
}

/**
 * Best-effort client identity for rate limiting. Proxy headers can be spoofed,
 * so this is only ever used for throttling, never for authorisation.
 */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return `${scope}:${ip}`;
}

export const LIMITS = {
  login: { limit: 8, windowMs: 5 * 60_000 },
  /// Admin sign-in is tighter than the storefront's: fewer legitimate users,
  /// and a far more valuable account to guess at.
  adminLogin: { limit: 5, windowMs: 10 * 60_000 },
  adminMutation: { limit: 240, windowMs: 60_000 },
  passwordReset: { limit: 4, windowMs: 30 * 60_000 },
  register: { limit: 5, windowMs: 15 * 60_000 },
  checkout: { limit: 12, windowMs: 10 * 60_000 },
  coupon: { limit: 20, windowMs: 5 * 60_000 },
  contact: { limit: 5, windowMs: 15 * 60_000 },
  review: { limit: 10, windowMs: 60 * 60_000 },
  search: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitOptions>;
