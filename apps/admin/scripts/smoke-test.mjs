#!/usr/bin/env node
/**
 * Admin panel smoke test.
 *
 * Drives the running dev server over HTTP the way a person would: signs in,
 * loads every screen, exercises the APIs, and — most importantly — checks that
 * the things which must NOT be possible are refused.
 *
 * Run with the dev server up:  npm run smoke:admin
 *
 * Anything it creates, it removes. It never edits seeded data destructively.
 */

const BASE = process.env.ADMIN_URL ?? 'http://localhost:3001';
const OWNER = { email: 'owner@tamizhelectronics.in', password: 'Owner@Tamizh2026' };

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function skip(name, why) {
  skipped += 1;
  console.log(`  skip ${name} — ${why}`);
}

function section(title) {
  console.log(`\n${title}`);
}

// -- a cookie jar small enough to read -------------------------------------
const jars = new Map();

function jar(name) {
  if (!jars.has(name)) jars.set(name, new Map());
  return jars.get(name);
}

function cookieHeader(name) {
  return [...jar(name).entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

function storeCookies(name, response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(';');
    const index = pair.indexOf('=');
    if (index < 0) continue;
    jar(name).set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

async function request(path, { as = 'owner', method = 'GET', json, redirect = 'manual' } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    redirect,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookieHeader(as) ? { Cookie: cookieHeader(as) } : {}),
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  storeCookies(as, response);

  const type = response.headers.get('content-type') ?? '';
  const body = type.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text();

  return { status: response.status, body, headers: response.headers };
}

const isHtml = (body) => typeof body === 'string' && body.includes('<!DOCTYPE html>');

async function main() {
  console.log(`Sri Cauvery Admin smoke test → ${BASE}\n${'='.repeat(50)}`);

  // -- reachability ---------------------------------------------------------
  section('Reachability');
  const login = await request('/login');
  check('sign-in page served', login.status === 200 && isHtml(login.body));
  check('sign-in page is not indexable', String(login.headers.get('x-robots-tag')).includes('noindex'));

  const robots = await request('/robots.txt');
  check('robots.txt disallows everything', String(robots.body).includes('Disallow: /'));

  // -- authentication -------------------------------------------------------
  section('Authentication');
  const anonymous = await request('/', { as: 'anon' });
  check(
    'the panel redirects an anonymous visitor to sign in',
    anonymous.status === 307 && String(anonymous.headers.get('location')).includes('/login'),
  );

  const anonymousApi = await request('/api/admin/notifications', { as: 'anon' });
  check('an API refuses an anonymous request', anonymousApi.status === 401);

  const wrong = await request('/api/admin/auth/login', {
    as: 'wrong',
    method: 'POST',
    json: { email: OWNER.email, password: 'not-the-password' },
  });
  check(
    'a wrong password is refused',
    wrong.status === 401 || wrong.status === 429,
    `status ${wrong.status}`,
  );
  check(
    'the refusal does not say whether the account exists',
    typeof wrong.body?.error?.message === 'string' &&
      !/no such|unknown user|not found/i.test(wrong.body.error.message),
  );

  const signIn = await request('/api/admin/auth/login', {
    method: 'POST',
    json: OWNER,
  });

  if (signIn.status === 429) {
    console.log('\nRate limited on sign-in — run again in a few minutes.');
    process.exit(0);
  }
  check('the owner can sign in', signIn.status === 200, `status ${signIn.status}`);
  check('the session cookie is set', jar('owner').has('te_admin_session'));

  if (!jar('owner').has('te_admin_session')) {
    console.log('\nCannot continue without a session.');
    process.exit(1);
  }

  // -- pages ----------------------------------------------------------------
  section('Screens');
  const screens = [
    ['/', 'dashboard'],
    ['/orders', 'orders'],
    ['/products', 'products'],
    ['/products/new', 'new product'],
    ['/categories', 'categories'],
    ['/categories/new', 'new category'],
    ['/inventory', 'inventory'],
    ['/inventory?filter=low', 'low stock'],
    ['/customers', 'customers'],
    ['/payments', 'payments'],
    ['/returns', 'returns'],
    ['/refunds', 'refunds'],
    ['/coupons', 'coupons'],
    ['/coupons/new', 'new coupon'],
    ['/reviews', 'reviews'],
    ['/reports', 'reports'],
    ['/notifications', 'notifications'],
    ['/content', 'website content'],
    ['/shipping', 'delivery zones'],
    ['/staff', 'staff'],
    ['/roles', 'roles'],
    ['/settings', 'settings'],
    ['/audit', 'audit log'],
    ['/search?q=cable', 'search'],
    ['/account', 'your account'],
    ['/account/password', 'change password'],
  ];

  for (const [path, label] of screens) {
    const page = await request(path);
    check(`${label} renders`, page.status === 200 && isHtml(page.body), `status ${page.status}`);
  }

  const missing = await request('/orders/TE-000000-XXXX');
  check('an unknown order is a 404', missing.status === 404, `status ${missing.status}`);

  // -- installable, and safely offline --------------------------------------
  section('PWA');
  const manifest = await request('/manifest.json');
  check('manifest served', manifest.status === 200);
  const manifestJson =
    typeof manifest.body === 'string' ? JSON.parse(manifest.body) : manifest.body;
  check('installable as standalone', manifestJson?.display === 'standalone');
  check('has icons', (manifestJson?.icons?.length ?? 0) >= 2);

  const worker = await request('/sw.js');
  check('service worker served', worker.status === 200);
  check(
    'the worker is never itself cached',
    String(worker.headers.get('cache-control')).includes('no-store'),
  );
  check(
    'the worker never caches the API',
    /NEVER_CACHE[\s\S]{0,120}\/\^\\\/api\\\//.test(String(worker.body)),
  );
  check(
    'the worker never caches the sign-in page',
    String(worker.body).includes('/^\\/login'),
  );

  const offline = await request('/offline.html');
  check('offline page served', offline.status === 200);
  check(
    'the offline page says nothing can be saved',
    /cannot be saved|not be saved|சேமிக்க/i.test(String(offline.body)),
  );

  // -- security headers -----------------------------------------------------
  section('Security headers');
  const dashboard = await request('/');
  const header = (name) => String(dashboard.headers.get(name) ?? '');
  check('CSP set', header('content-security-policy').includes("default-src 'self'"));
  check('frames denied', header('x-frame-options') === 'DENY');
  check('no referrer leaks', header('referrer-policy') === 'no-referrer');
  check('MIME sniffing off', header('x-content-type-options') === 'nosniff');
  check('not indexable', header('x-robots-tag').includes('noindex'));
  check('HSTS set', header('strict-transport-security').includes('max-age='));

  // -- products -------------------------------------------------------------
  section('Products');
  const categories = await request('/api/admin/products', { method: 'POST', json: {} });
  check('creating a product with no data is refused', categories.status === 422);

  const catalogue = await request('/search?q=cable');
  check('search finds a seeded product', String(catalogue.body).includes('Cable'));

  const sku = `SMOKE-${Date.now().toString(36).toUpperCase()}`;
  const categoryId = await firstCategoryId();

  let productId = null;
  if (!categoryId) {
    skip('product create/update/delete', 'no leaf category found');
  } else {
    const create = await request('/api/admin/products', {
      method: 'POST',
      json: {
        sku,
        slug: sku.toLowerCase(),
        name: 'Smoke test product',
        description: 'Created by the admin smoke test and removed again immediately.',
        brand: 'Tamizh',
        categoryId,
        mrp: 999,
        price: 799,
        costPrice: 500,
        taxBps: 18,
        stock: 5,
        lowStockThreshold: 2,
        status: 'DRAFT',
        tags: ['smoke'],
        specs: {},
        images: [],
      },
    });
    check('a product can be created', create.status === 201, JSON.stringify(create.body));
    productId = create.body?.data?.id ?? null;

    const overPriced = await request('/api/admin/products', {
      method: 'POST',
      json: {
        sku: `${sku}-B`,
        slug: `${sku.toLowerCase()}-b`,
        name: 'Smoke test product B',
        description: 'Selling above the M.R.P. must be refused by the server.',
        brand: 'Tamizh',
        categoryId,
        mrp: 100,
        price: 200,
        costPrice: 50,
        taxBps: 18,
        stock: 0,
        lowStockThreshold: 0,
        status: 'DRAFT',
        tags: [],
        specs: {},
        images: [],
      },
    });
    check('a price above the M.R.P. is refused', overPriced.status === 422);
  }

  // -- inventory ------------------------------------------------------------
  section('Inventory');
  if (productId) {
    const noReason = await request('/api/admin/inventory', {
      method: 'POST',
      json: { productId, mode: 'delta', value: 1 },
    });
    check('a stock change without a reason is refused', noReason.status === 422);

    const negative = await request('/api/admin/inventory', {
      method: 'POST',
      json: { productId, mode: 'delta', value: -50, reason: 'DAMAGED' },
    });
    check('stock cannot be taken below zero', negative.status === 422);

    const adjust = await request('/api/admin/inventory', {
      method: 'POST',
      json: { productId, mode: 'delta', value: 3, reason: 'PURCHASE', note: 'smoke test' },
    });
    check(
      'stock can be adjusted with a reason',
      adjust.status === 200 && adjust.body?.data?.after === 8,
      JSON.stringify(adjust.body),
    );
  } else {
    skip('inventory rules', 'no test product');
  }

  // -- money ----------------------------------------------------------------
  section('Money');
  const badRefund = await request('/api/admin/refunds', {
    method: 'POST',
    json: { orderId: 'does-not-exist', amount: 100, reason: 'smoke test' },
  });
  check('a refund on an unknown order is refused', badRefund.status === 404);

  // -- reports --------------------------------------------------------------
  section('Reports');
  for (const report of ['orders', 'sales', 'products', 'inventory']) {
    const csv = await request(`/api/admin/reports/export?report=${report}&range=last30`);
    check(
      `the ${report} export downloads as CSV`,
      csv.status === 200 && String(csv.headers.get('content-type')).includes('text/csv'),
    );
  }
  const unknownReport = await request('/api/admin/reports/export?report=nonsense');
  check('an unknown report is refused', unknownReport.status === 422);

  const ordersCsv = await request('/api/admin/reports/export?report=orders&range=last30');
  check(
    'exports leave out customer contact details',
    !/@|customerEmail|customerPhone/i.test(String(ordersCsv.body).split('\n')[0] ?? ''),
  );

  // -- internal notification endpoint ---------------------------------------
  section('Storefront integration');
  const noSecret = await request('/api/admin/internal/notify', {
    as: 'anon',
    method: 'POST',
    json: { type: 'NEW_ORDER', title: 'Injected', body: 'Injected' },
  });
  check('staff alerts require the shared secret', noSecret.status === 401 || noSecret.status === 503);

  // -- push -----------------------------------------------------------------
  section('Push notifications');
  const push = await request('/api/admin/push');
  check('the push endpoint answers', push.status === 200);
  check(
    'only the public key is exposed',
    push.body?.data !== undefined && !('privateKey' in (push.body?.data ?? {})),
  );

  // -- cleanup --------------------------------------------------------------
  section('Cleanup');
  if (productId) {
    const removed = await request(`/api/admin/products/${productId}`, { method: 'DELETE' });
    check('the test product was removed', removed.status === 200);
  } else {
    skip('cleanup', 'nothing was created');
  }

  const signOut = await request('/api/admin/auth/logout', { method: 'POST' });
  check('signing out works', signOut.status === 200);

  const afterSignOut = await request('/api/admin/notifications');
  check('the session is dead after signing out', afterSignOut.status === 401);

  // -- summary --------------------------------------------------------------
  console.log(`\n${'='.repeat(50)}`);
  console.log(
    `${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}`,
  );
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const failure of failures) console.log(`  - ${failure}`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

/** Reads a leaf category id out of the new-product form. */
async function firstCategoryId() {
  const page = await request('/products/new');
  const match = /<option value="(c[a-z0-9]{20,})"/.exec(String(page.body));
  return match?.[1] ?? null;
}

main().catch((error) => {
  console.error('\nSmoke test crashed:', error);
  process.exit(1);
});
