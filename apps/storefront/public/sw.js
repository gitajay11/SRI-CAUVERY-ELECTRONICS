/* eslint-disable no-restricted-globals */
/**
 * Tamizh Electronics service worker.
 *
 * Caching strategy, by request type:
 *
 *   navigations      network-first, falling back to the cached page, then to
 *                    the offline fallback. Never serves a stale checkout.
 *   static assets     stale-while-revalidate (JS/CSS chunks, fonts, icons).
 *   product images    cache-first with an LRU trim — images are immutable and
 *                     make up most of the bytes on a catalogue page.
 *   API + auth        never cached. Prices, stock, carts and orders must be
 *                     live, and nothing personal should sit in a shared cache.
 *
 * Bump CACHE_VERSION to invalidate everything after a deploy.
 */

const CACHE_VERSION = 'v3';
const SHELL_CACHE = `te-shell-${CACHE_VERSION}`;
const PAGES_CACHE = `te-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `te-assets-${CACHE_VERSION}`;
const IMAGE_CACHE = `te-images-${CACHE_VERSION}`;

/**
 * A plain static document, not an app route: the worker returns it for
 * whatever URL failed, and a React-rendered page would hydrate against a URL
 * it was never rendered for and get stuck refetching a route that cannot load.
 */
const OFFLINE_URL = '/offline.html';
const MAX_IMAGE_ENTRIES = 160;
const MAX_PAGE_ENTRIES = 40;

/** Precached on install so the app opens even on a cold, offline start. */
const SHELL_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
];

/**
 * Anything matching these is never read from or written to a cache.
 * Cart, wishlist, orders and account pages are per-user and must not be
 * served to whoever opens the browser next.
 */
const NEVER_CACHE = [
  /^\/api\//,
  /^\/admin(\/|$)/,
  /^\/checkout(\/|$)/,
  /^\/cart(\/|$)/,
  /^\/account(\/|$)/,
  /^\/orders(\/|$)/,
  /^\/order\//,
  /^\/wishlist(\/|$)/,
  /^\/signin(\/|$)/,
  /^\/register(\/|$)/,
];

const isPrivate = (pathname) => NEVER_CACHE.some((pattern) => pattern.test(pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually, so one 404 cannot fail the whole install.
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
      const current = [SHELL_CACHE, PAGES_CACHE, ASSET_CACHE, IMAGE_CACHE];
      await Promise.all(
        keys.filter((key) => !current.includes(key)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle our own origin; third-party requests pass straight through.
  if (url.origin !== self.location.origin) return;
  if (isPrivate(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
  }
});

/**
 * Network-first for pages: a shopper online always sees live prices and
 * stock. The cached copy only appears when the network fails.
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
    if (cached) return cached;
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

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      cache.put(request, response.clone());
      void trim(cacheName, maxEntries);
    }
    return response;
  } catch {
    return cached ?? Response.error();
  }
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

/** Crude LRU: Cache Storage keeps insertion order, so drop from the front. */
async function trim(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}
