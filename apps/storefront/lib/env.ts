import 'server-only';

/**
 * Validated server environment.
 *
 * Everything here is read lazily so that `next build` never explodes on a
 * machine that has not configured secrets yet; the checks run the first time
 * a request actually needs the value.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';

/** Raw connection string; empty string means "not configured". */
export const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';

/**
 * True when the app should talk to PostgreSQL. Without a DATABASE_URL the app
 * falls back to the in-memory demo catalogue, which is only ever allowed
 * outside production — see services/repository.ts.
 */
export const hasDatabase = databaseUrl.length > 0;

/**
 * Secret used to sign session cookies (HMAC-SHA256).
 *
 * In development we derive a stable throwaway key so `npm run dev` works with
 * zero configuration; in production the variable is mandatory.
 */
export function authSecret(): string {
  const value = process.env.AUTH_SECRET?.trim();
  if (value && value.length >= 32) return value;
  if (isProduction) {
    throw new Error(
      'AUTH_SECRET must be set to a random string of at least 32 characters in production.',
    );
  }
  return 'tamizh-electronics-development-only-secret-key-do-not-use-in-prod';
}

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export const paymentProvider = (process.env.PAYMENT_PROVIDER?.trim() || 'mock') as
  | 'mock'
  | 'razorpay';

/**
 * Live keys move real money, so they are refused anywhere that is not the
 * production deployment.
 *
 * Without this, a `.env` copied to a laptop, a preview deployment, or a smoke
 * test would create real orders against real cards — and the mistake is
 * invisible until a customer is charged. Test keys are unrestricted; the
 * expensive direction is the only one worth guarding.
 *
 * `VERCEL_ENV` is checked before `NODE_ENV` because preview deployments build
 * with NODE_ENV=production and would otherwise be treated as the real site.
 */
function assertLiveKeyAllowed(keyId: string): string {
  if (!keyId.startsWith('rzp_live_')) return keyId;

  const vercelEnv = process.env.VERCEL_ENV;
  const allowed = vercelEnv ? vercelEnv === 'production' : isProduction;

  if (!allowed) {
    throw new Error(
      'Refusing to use live Razorpay keys outside production ' +
        `(VERCEL_ENV=${vercelEnv ?? 'unset'}, NODE_ENV=${process.env.NODE_ENV}). ` +
        'Use rzp_test_ keys here.',
    );
  }
  return keyId;
}

export const razorpay = {
  keyId: () => assertLiveKeyAllowed(required('RAZORPAY_KEY_ID', process.env.RAZORPAY_KEY_ID)),
  keySecret: () => {
    // Reading the id first means the guard runs whichever value is asked for.
    assertLiveKeyAllowed(required('RAZORPAY_KEY_ID', process.env.RAZORPAY_KEY_ID));
    return required('RAZORPAY_KEY_SECRET', process.env.RAZORPAY_KEY_SECRET);
  },
  webhookSecret: () =>
    required('RAZORPAY_WEBHOOK_SECRET', process.env.RAZORPAY_WEBHOOK_SECRET),
  isConfigured: () =>
    Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
};
