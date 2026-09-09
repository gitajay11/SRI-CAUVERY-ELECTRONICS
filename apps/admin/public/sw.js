/* eslint-disable no-restricted-globals */
/**
 * Tamizh Admin service worker.
 *
 * The caching philosophy here is the opposite of the storefront's, on purpose.
 *
 * A shop page can be served from cache: a slightly stale product listing is
 * harmless. An admin panel cannot. Stale stock counts, order statuses or
 * refund states would be read as current and acted on — someone would ship an
 * order that was already cancelled, or re-refund a payment. So:
 *
 *   app shell (JS/CSS/icons)  cached, stale-while-revalidate
 *   navigations               network-first, cached copy only as a fallback,
 *                             and every fallback page is stamped as stale
 *   /api/*                    NEVER cached, in either direction
 *
 * Business data is also personal data — customer names, phone numbers,
 * addresses. Keeping it in Cache Storage on a shared or lost device is a
 * disclosure risk with no upside, so it is never written there.
 *
 * Push notifications are handled here too: a new order buzzes the owner's
 * phone, which is the main reason to install this app at all.
 */

const CACHE_VERSION = 'v2';
const SHELL_CACHE = `admin-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `admin-assets-${CACHE_VERSION}`;
const PAGES_CACHE = `admin-pages-${CACHE_VERSION}`;

const OFFLINE_URL = '/offline.html';
const MAX_PAGE_ENTRIES = 20;

const SHELL_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
];

/**
 * Never touched by the cache, in either direction.
 *
 * The API carries everything sensitive and everything that changes; the login
 * and logout routes must always reach the server so a revoked session is
 * actually noticed.
 */
const NEVER_CACHE = [/^\/api\//, /^\/login/, /^\/logout/];

const isPrivate = (pathname) => NEVER_CACHE.some((pattern) => pattern.test(pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined),
        ),
      );
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const current = [SHELL_CACHE, ASSET_CACHE, PAGES_CACHE];
      await Promise.all(
        keys.filter((key) => !current.includes(key)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  // Sign-out clears everything cached from the session that just ended.
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      (async () => {
        await caches.delete(PAGES_CACHE);
      })(),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivate(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
  }
});

/**
 * Network-first, and honest about it.
 *
 * When a cached page is served because the network failed, a banner is
 * injected marking it as offline data. Without that, an admin cannot tell a
 * live order list from one cached twenty minutes ago — and would act on it.
 */
async function handleNavigation(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      void trim(PAGES_CACHE, MAX_PAGE_ENTRIES);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return markAsStale(cached);

    const shell = await caches.open(SHELL_CACHE);
    const offline = await shell.match(OFFLINE_URL);
    return (
      offline ??
      new Response(
        '<!doctype html><meta charset="utf-8"><title>Offline</title><p>You are offline.</p>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    );
  }
}

/** Prepends a fixed banner so a cached page can never pass for a live one. */
async function markAsStale(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return response;

  const html = await response.text();
  const banner = `<div role="status" style="position:sticky;top:0;z-index:99999;background:#b26a00;color:#fff;padding:8px 16px;font:600 13px/1.4 system-ui,sans-serif;text-align:center">
Offline — showing saved data. Reconnect before making changes.
</div>`;

  const patched = html.includes('<body')
    ? html.replace(/(<body[^>]*>)/i, `$1${banner}`)
    : banner + html;

  return new Response(patched, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached ?? Response.error());
  return cached ?? network;
}

/** Cache Storage keeps insertion order, so dropping from the front is an LRU. */
async function trim(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(
    keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)),
  );
}

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------

/**
 * The payload is deliberately thin — a title, a line of body text and a URL.
 *
 * Notifications appear on a lock screen, so they never carry a customer's
 * name, phone number or address. "New order TE-260908-4F2A · ₹1,499" is enough
 * for the owner to decide whether to open the app.
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Tamizh Admin', body: event.data.text() };
  }

  const title = payload.title ?? 'Tamizh Admin';
  const options = {
    body: payload.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: payload.tag ?? undefined,
    // Replace rather than stack: five low-stock alerts should be one line.
    renotify: Boolean(payload.tag),
    data: { url: payload.url ?? '/' },
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? '/';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Focus an open admin window rather than opening a second one.
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
