import 'server-only';

/**
 * Validated server environment for the admin app.
 *
 * Read lazily so a build never fails on a machine that has not configured
 * secrets; the check runs the first time a request actually needs the value.
 *
 * Nothing here is ever exposed to the browser. The admin app has no
 * NEXT_PUBLIC_ secrets by design — the only public value is the site URL.
 */

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/**
 * Secret used to sign the admin session cookie.
 *
 * Deliberately separate from the storefront's AUTH_SECRET: if the storefront's
 * secret ever leaks, it must not be usable to mint an administrator session.
 */
export function adminAuthSecret(): string {
  const value = process.env.ADMIN_AUTH_SECRET?.trim();
  if (value && value.length >= 32) return value;
  if (isProduction) {
    throw new Error(
      'ADMIN_AUTH_SECRET must be set to a random string of at least 32 characters in production.',
    );
  }
  return 'tamizh-admin-development-only-secret-key-do-not-use-in-production';
}

export function adminSiteUrl(): string {
  const raw = process.env.ADMIN_SITE_URL?.trim() || 'http://localhost:3001';
  return raw.replace(/\/+$/, '');
}

/** Where the customer-facing shop lives, for "view in shop" links. */
export function storefrontUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

/** How long an admin session lasts. Much shorter than a shopper's. */
export const SESSION_HOURS = Number(process.env.ADMIN_SESSION_HOURS ?? 12);

/** Idle timeout: a session untouched for this long is treated as expired. */
export const SESSION_IDLE_HOURS = Number(process.env.ADMIN_SESSION_IDLE_HOURS ?? 4);

/**
 * Web Push (VAPID). Push is simply unavailable until these are configured —
 * the UI says so rather than failing silently.
 */
export const push = {
  publicKey: () => process.env.VAPID_PUBLIC_KEY?.trim() ?? '',
  privateKey: () => required('VAPID_PRIVATE_KEY', process.env.VAPID_PRIVATE_KEY),
  subject: () =>
    process.env.VAPID_SUBJECT?.trim() || 'mailto:support@tamizhelectronics.in',
  isConfigured: () =>
    Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()),
};

export type StorageProvider = 'local' | 'blob';

/**
 * Where product images go.
 *
 * `local` writes into the storefront's public folder, which is right for
 * development: one repository, one disk, and the shop serves the file with no
 * further configuration. It cannot work once deployed — a serverless
 * filesystem is read-only, and the two applications are separate deployments,
 * so the admin has no storefront folder to write into.
 *
 * `blob` is Vercel Blob. The default below picks it automatically whenever
 * its token is present, so connecting a store in the Vercel dashboard is the
 * whole of the setup; nothing has to be set by hand.
 */
export const storage = {
  /**
   * A getter, not a captured constant.
   *
   * As a constant this was evaluated the first time the module was imported,
   * which risks baking in whatever the environment looked like at build time —
   * and a Blob store connected after that build would never be noticed. Read
   * per access, connecting the store and redeploying is enough.
   *
   * An unrecognised STORAGE_PROVIDER falls through to detection rather than
   * being cast to a provider that does not exist, which previously turned a
   * typo into an unexplained failure.
   */
  get provider(): StorageProvider {
    const explicit = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
    if (explicit === 'local' || explicit === 'blob') return explicit;
    return process.env.BLOB_READ_WRITE_TOKEN?.trim() ? 'blob' : 'local';
  },

  /**
   * Why the provider is what it is, in words an operator can act on.
   *
   * An upload that fails on configuration should say which configuration, not
   * leave somebody guessing between "did the store attach", "did it redeploy"
   * and "is something overriding it".
   */
  describe(): string {
    const explicit = process.env.STORAGE_PROVIDER?.trim();
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim() ? 'present' : 'missing';
    const override = explicit ? `STORAGE_PROVIDER="${explicit}"` : 'STORAGE_PROVIDER unset';
    return `provider=${this.provider}, ${override}, BLOB_READ_WRITE_TOKEN ${token}`;
  },

  localDir: () =>
    process.env.STORAGE_LOCAL_DIR?.trim() || '../storefront/public/uploads',
  publicPrefix: () => process.env.STORAGE_PUBLIC_PREFIX?.trim() || '/uploads',
  /**
   * The largest image the panel will accept.
   *
   * Uploads to Blob go through this function, and Vercel caps a function's
   * request body at 4.5 MB — so on that provider the ceiling is not ours to
   * choose. Enforcing it here means a 5 MB photo is refused by us, with a
   * message naming the real limit, instead of being accepted and then dying at
   * the platform boundary with nothing useful to show for it.
   */
  maxBytes(): number {
    const configured = Number(process.env.STORAGE_MAX_BYTES ?? 5 * 1024 * 1024);
    return this.provider === 'blob'
      ? Math.min(configured, 4.5 * 1024 * 1024)
      : configured;
  },
  /** Present only when a Blob store is connected. */
  blobToken: () => process.env.BLOB_READ_WRITE_TOKEN?.trim() || '',
};

/**
 * Shared secret for storefront → admin notifications.
 *
 * Empty means the feature is off: the endpoint refuses every call rather than
 * accepting unauthenticated ones. Never sent to a browser.
 */
export function internalNotifySecret(): string {
  const value = process.env.INTERNAL_NOTIFY_SECRET?.trim() ?? '';
  return value.length >= 24 ? value : '';
}
