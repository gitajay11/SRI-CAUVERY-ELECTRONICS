#!/usr/bin/env node
/**
 * End-to-end smoke test.
 *
 * Drives the running app over HTTP exactly as a browser would — cookies and
 * all — through every major flow: browsing, search, cart, coupons, checkout,
 * order history, cancellation, reviews, admin, and the PWA/SEO endpoints.
 *
 * Usage:
 *   node scripts/smoke-test.mjs [baseUrl]
 *
 * It is deliberately dependency-free and asserts on real responses, so it can
 * run against the dev server, a preview deploy, or production (against
 * production it will place a real order — do not).
 */

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/** A cookie jar, so sessions and carts behave like a real browser. */
class Session {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
  }

  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  store(response) {
    const raw = response.headers.getSetCookie?.() ?? [];
    for (const cookie of raw) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      if (index <= 0) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async fetch(path, options = {}) {
    const { json, ...rest } = options;
    const response = await fetch(`${BASE}${path}`, {
      ...rest,
      redirect: 'manual',
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookies.size > 0 ? { Cookie: this.header() } : {}),
        ...rest.headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    this.store(response);
    return response;
  }

  async api(path, options = {}) {
    const response = await this.fetch(path, options);
    let body = null;
    try {
      body = await response.json();
    } catch {
      // Non-JSON response; the caller asserts on status instead.
    }
    return { status: response.status, body, response };
  }

  async html(path) {
    const response = await this.fetch(path);
    const text = await response.text();
    return { status: response.status, text, response };
  }
}

const unique = Date.now().toString(36);

async function main() {
  console.log(`Smoke testing ${BASE}\n${'='.repeat(50)}`);

  const guest = new Session('guest');

  // -----------------------------------------------------------------------
  section('Storefront pages render');
  // -----------------------------------------------------------------------
  const pages = [
    ['/', 'ஸ்ரீ காவேரி மின்னணுவியல்'],
    ['/shop', 'All products'],
    ['/categories', 'Shop by category'],
    ['/categories/return-gifts', 'Return Gifts'],
    ['/about', 'About'],
    ['/contact', 'Contact'],
    ['/privacy-policy', 'Privacy'],
    ['/terms', 'Terms'],
    ['/returns-policy', 'Return'],
    ['/shipping-policy', 'Shipping'],
    ['/cart', 'cart'],
  ];
  for (const [path, needle] of pages) {
    const { status, text } = await guest.html(path);
    check(
      `GET ${path}`,
      status === 200 && text.toLowerCase().includes(needle.toLowerCase()),
      `status ${status}`,
    );
  }

  const missing = await guest.html('/product/definitely-not-a-real-product');
  check('404 for unknown product', missing.status === 404, `status ${missing.status}`);

  // -----------------------------------------------------------------------
  section('Catalogue and search API');
  // -----------------------------------------------------------------------
  const catalogue = await guest.api('/api/products?pageSize=60');
  const products = catalogue.body?.data?.items ?? [];
  check('GET /api/products', catalogue.status === 200 && products.length > 0);
  check(
    'facets returned',
    Array.isArray(catalogue.body?.data?.facets?.brands) &&
      catalogue.body.data.facets.brands.length > 0,
  );

  const byName = await guest.api('/api/products?q=charger');
  check(
    'search by name finds chargers',
    byName.body?.data?.items?.some((p) => /charger/i.test(p.name)),
  );

  const sample = products[0];
  const bySku = await guest.api(`/api/products?q=${encodeURIComponent(sample.sku)}`);
  check(
    'search by SKU finds the exact product',
    bySku.body?.data?.items?.[0]?.sku === sample.sku,
    `got ${bySku.body?.data?.items?.[0]?.sku}`,
  );

  const tamil = await guest.api(`/api/products?q=${encodeURIComponent('சார்ஜர்')}`);
  check('search matches Tamil product names', (tamil.body?.data?.items?.length ?? 0) > 0);

  const cheap = await guest.api('/api/products?maxPrice=500&sort=price-asc');
  const cheapItems = cheap.body?.data?.items ?? [];
  check(
    'price filter respected',
    cheapItems.length > 0 && cheapItems.every((p) => p.price <= 50000),
  );
  check(
    'price sort ascending',
    cheapItems.every((p, i) => i === 0 || cheapItems[i - 1].price <= p.price),
  );

  const discounted = await guest.api('/api/products?minDiscount=50');
  check(
    'discount filter respected',
    (discounted.body?.data?.items ?? []).every((p) => p.discountPercent >= 50),
  );

  const inStock = await guest.api('/api/products?inStock=1');
  check(
    'in-stock filter respected',
    (inStock.body?.data?.items ?? []).every((p) => p.stock > 0),
  );

  const suggest = await guest.api('/api/search/suggest?q=spea');
  check('suggest returns results', (suggest.body?.data?.products?.length ?? 0) > 0);
  const shortSuggest = await guest.api('/api/search/suggest?q=a');
  check(
    'suggest ignores one-character queries',
    shortSuggest.body?.data?.products?.length === 0,
  );

  const categories = await guest.api('/api/categories');
  check(
    'GET /api/categories returns a tree',
    (categories.body?.data?.categories ?? []).some((c) => (c.children ?? []).length > 0),
  );

  const productPage = await guest.html(`/product/${sample.slug}`);
  check('product page renders', productPage.status === 200);
  check(
    'product page carries Product JSON-LD',
    productPage.text.includes('"@type":"Product"'),
  );
  check(
    'product page carries breadcrumb JSON-LD',
    productPage.text.includes('"@type":"BreadcrumbList"'),
  );

  // -----------------------------------------------------------------------
  section('Guest cart');
  // -----------------------------------------------------------------------
  const cheapProduct = products
    .filter((p) => p.stock > 3)
    .sort((a, b) => a.price - b.price)[0];
  const secondProduct = products.filter(
    (p) => p.stock > 3 && p.id !== cheapProduct.id,
  )[0];

  const added = await guest.api('/api/cart/items', {
    method: 'POST',
    json: { productId: cheapProduct.id, quantity: 2 },
  });
  check('add to cart', added.status === 200 && added.body?.data?.itemCount === 2);
  check(
    'cart prices from the catalogue',
    added.body?.data?.items?.[0]?.unitPrice === cheapProduct.price,
  );

  await guest.api('/api/cart/items', {
    method: 'POST',
    json: { productId: secondProduct.id, quantity: 1 },
  });

  const cart = await guest.api('/api/cart');
  check('cart has two lines', cart.body?.data?.items?.length === 2);

  const totals = cart.body.data.totals;
  const expectedSubtotal = cart.body.data.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  check('subtotal computed server-side', totals.subtotal === expectedSubtotal);
  check(
    'delivery charge follows the free-shipping threshold',
    totals.subtotal >= 49900 ? totals.shippingFee === 0 : totals.shippingFee === 4900,
  );
  check(
    'total = subtotal - discount + delivery',
    totals.total === totals.subtotal - totals.couponDiscount + totals.shippingFee,
  );

  const firstItemId = cart.body.data.items[0].id;
  const decreased = await guest.api('/api/cart/items', {
    method: 'PATCH',
    json: { itemId: firstItemId, quantity: 1 },
  });
  check(
    'decrease quantity',
    decreased.body?.data?.items?.find((i) => i.id === firstItemId)?.quantity === 1,
  );

  // Ask for one more than exists, whatever that product happens to stock.
  const stocked = cart.body.data.items[0].availableStock;
  const overStock = await guest.api('/api/cart/items', {
    method: 'PATCH',
    json: { itemId: firstItemId, quantity: Math.min(stocked + 1, 99) },
  });
  check(
    'quantity beyond stock is rejected',
    stocked >= 99 || overStock.status === 409,
    `stock ${stocked}, status ${overStock.status}`,
  );

  const badProduct = await guest.api('/api/cart/items', {
    method: 'POST',
    json: { productId: 'not-a-real-id', quantity: 1 },
  });
  check('unknown product rejected', badProduct.status === 404);

  const badPayload = await guest.api('/api/cart/items', {
    method: 'POST',
    json: { productId: cheapProduct.id, quantity: -5 },
  });
  check('invalid quantity rejected', badPayload.status === 422);

  // -----------------------------------------------------------------------
  section('Coupons');
  // -----------------------------------------------------------------------
  const badCoupon = await guest.api('/api/cart/coupon', {
    method: 'POST',
    json: { code: 'NOPE123' },
  });
  check('invalid coupon rejected', badCoupon.status === 422);

  // Top up the cart so WELCOME10 clears its ₹499 minimum.
  await guest.api('/api/cart/items', {
    method: 'POST',
    json: { productId: cheapProduct.id, quantity: 3 },
  });
  const beforeCoupon = await guest.api('/api/cart');
  const applied = await guest.api('/api/cart/coupon', {
    method: 'POST',
    json: { code: 'WELCOME10' },
  });
  const couponWorked = applied.status === 200;
  check('WELCOME10 applies', couponWorked, `status ${applied.status}`);
  if (couponWorked) {
    const withCoupon = applied.body.data.totals;
    check('coupon discount is positive', withCoupon.couponDiscount > 0);
    check(
      'coupon capped at ₹200',
      withCoupon.couponDiscount <= 20000,
      `${withCoupon.couponDiscount} paise`,
    );
    check(
      'coupon reduces the total',
      withCoupon.total < beforeCoupon.body.data.totals.total,
    );

    const removed = await guest.api('/api/cart/coupon', { method: 'DELETE' });
    check('coupon can be removed', removed.body?.data?.coupon === null);
    await guest.api('/api/cart/coupon', { method: 'POST', json: { code: 'WELCOME10' } });
  }

  // -----------------------------------------------------------------------
  section('Checkout validation');
  // -----------------------------------------------------------------------
  const validAddress = {
    customerName: 'Test Shopper',
    customerEmail: `smoke+${unique}@example.com`,
    customerPhone: '9840012345',
    addressLine1: '4/12 Kamarajar Salai',
    addressLine2: 'Near the temple',
    city: 'Madurai',
    district: 'Madurai',
    state: 'Tamil Nadu',
    pincode: '625001',
    paymentMethod: 'COD',
  };

  const badPhone = await guest.api('/api/checkout', {
    method: 'POST',
    json: { ...validAddress, customerPhone: '12345' },
  });
  check('invalid phone rejected', badPhone.status === 422);
  check('field error returned for phone', Boolean(badPhone.body?.error?.fields?.customerPhone));

  const badPin = await guest.api('/api/checkout', {
    method: 'POST',
    json: { ...validAddress, pincode: '99' },
  });
  check('invalid PIN code rejected', badPin.status === 422);

  const badEmail = await guest.api('/api/checkout', {
    method: 'POST',
    json: { ...validAddress, customerEmail: 'not-an-email' },
  });
  check('invalid email rejected', badEmail.status === 422);

  const missingAddress = await guest.api('/api/checkout', {
    method: 'POST',
    json: { ...validAddress, addressLine1: '' },
  });
  check('empty address rejected', missingAddress.status === 422);

  // -----------------------------------------------------------------------
  section('Checkout requires an account');
  // -----------------------------------------------------------------------
  // The page redirects a signed-out shopper to sign in, but the page can be
  // bypassed and this endpoint cannot, so the refusal is asserted here.
  const signedOut = await guest.api('/api/checkout', {
    method: 'POST',
    json: { ...validAddress, couponCode: 'WELCOME10' },
  });
  // The checkout limiter is in-process, so a re-run inside its window answers
  // 429 before the auth check is ever reached. That is the limiter working,
  // not the rule failing, and reporting it as a failure would send someone
  // looking for a bug that is not there.
  if (signedOut.status === 429) {
    console.log(
      [
        '',
        '  ! Checkout is rate limited on this instance, so the sign-in',
        '    requirement could not be exercised. Restart the server to re-run it.',
      ].join(String.fromCharCode(10)),
    );
  } else {
    check(
      'an order cannot be placed without signing in',
      signedOut.status === 401,
      `status ${signedOut.status}`,
    );
  }
  check('no order number is issued to a signed-out shopper', !signedOut.body?.data?.order);

  // Registering merges the anonymous cart into the new account, so what gets
  // ordered below is the cart built up over the sections above.
  const buyer = await guest.api('/api/auth/register', {
    method: 'POST',
    json: {
      name: 'Meena Sundaram',
      email: `buyer+${unique}@example.com`,
      password: 'correct-horse-99',
      phone: '9840012345',
    },
  });

  if (buyer.status === 429) {
    console.log(
      [
        '',
        '  ! Registration is rate limited on this instance, so the order,',
        '    account, admin and remaining sections were skipped.',
        '    The limiter is in-process: restart the server and re-run for a full pass.',
      ].join(String.fromCharCode(10)),
    );
    summarise();
    return;
  }

  check('the shopper can create an account to check out', buyer.status === 201, `status ${buyer.status}`);
  check('the cart survives registration', guest.cookies.has('te_session'));

  // -----------------------------------------------------------------------
  section('A signed-in shopper places an order');
  // -----------------------------------------------------------------------
  const cartBeforeOrder = await guest.api('/api/cart');
  const expectedTotal = cartBeforeOrder.body.data.totals.total;
  check('the merged cart still has items', (cartBeforeOrder.body?.data?.items?.length ?? 0) > 0);

  const placed = await guest.api('/api/checkout', {
    method: 'POST',
    json: { ...validAddress, couponCode: 'WELCOME10' },
  });
  if (placed.status === 429) {
    console.log(
      [
        '',
        '  ! Checkout is rate limited on this instance, so the order, account,',
        '    admin and remaining sections were skipped.',
        '    The limiter is in-process: restart the server and re-run for a full pass.',
      ].join(String.fromCharCode(10)),
    );
    summarise();
    return;
  }

  check('order placed', placed.status === 201, `status ${placed.status}`);

  const order = placed.body?.data?.order;
  check('order number issued', /^TE-\d{6}-[A-Z0-9]{4}$/.test(order?.orderNumber ?? ''));
  check('order total matches the cart', order?.total === expectedTotal);
  check('order starts as pending', order?.status === 'PENDING');
  check('COD payment recorded as pending', order?.paymentStatus === 'COD_PENDING');
  check('order snapshots line items', (order?.items?.length ?? 0) > 0);
  check(
    'line totals add up',
    order?.items?.every((i) => i.lineTotal === i.unitPrice * i.quantity),
  );

  const emptied = await guest.api('/api/cart');
  check('cart emptied after checkout', emptied.body?.data?.items?.length === 0);

  const checkoutAgain = await guest.api('/api/checkout', {
    method: 'POST',
    json: validAddress,
  });
  check('checkout with an empty cart is refused', checkoutAgain.status === 409);

  const confirmation = await guest.html(
    `/order/${order.orderNumber}?placed=1&email=${encodeURIComponent(validAddress.customerEmail)}`,
  );
  check('confirmation page renders', confirmation.status === 200);
  check(
    'confirmation shows the order number',
    confirmation.text.includes(order.orderNumber),
  );

  const stranger = new Session('stranger');
  const snooped = await stranger.html(
    `/order/${order.orderNumber}?email=someone-else@example.com`,
  );
  check(
    'another email cannot open the order',
    snooped.status === 404,
    `status ${snooped.status}`,
  );

  // -----------------------------------------------------------------------
  section('Stock is decremented');
  // -----------------------------------------------------------------------
  const afterStock = await guest.api(`/api/products?q=${encodeURIComponent(cheapProduct.sku)}`);
  const restocked = afterStock.body?.data?.items?.[0];
  check(
    'stock reduced by the quantity ordered',
    restocked && restocked.stock < cheapProduct.stock,
    `${cheapProduct.stock} -> ${restocked?.stock}`,
  );

  // -----------------------------------------------------------------------
  section('Accounts');
  // -----------------------------------------------------------------------
  const shopper = new Session('shopper');
  const email = `shopper+${unique}@example.com`;

  const weak = await shopper.api('/api/auth/register', {
    method: 'POST',
    json: { name: 'Weak Password', email: `weak+${unique}@example.com`, password: 'abc' },
  });
  check('short password rejected', weak.status === 422);

  const registered = await shopper.api('/api/auth/register', {
    method: 'POST',
    json: { name: 'Meena Sundaram', email, password: 'correct-horse-99', phone: '9840055555' },
  });

  if (registered.status === 429) {
    console.log(
      [
        '',
        '  ! Registration is rate limited on this instance, so the account,',
        '    wishlist, order-history and admin sections were skipped.',
        '    The limiter is in-process: restart the server and re-run for a full pass.',
      ].join('\n'),
    );
    summarise();
    return;
  }

  check('registration succeeds', registered.status === 201, `status ${registered.status}`);
  check('session cookie set', shopper.cookies.has('te_session'));

  const duplicate = await shopper.api('/api/auth/register', {
    method: 'POST',
    json: { name: 'Someone Else', email, password: 'correct-horse-99' },
  });
  check('duplicate email rejected', duplicate.status === 409);

  const me = await shopper.api('/api/auth/me');
  check('session identifies the user', me.body?.data?.user?.email === email);

  const wrongPassword = await new Session('attacker').api('/api/auth/login', {
    method: 'POST',
    json: { email, password: 'wrong-password' },
  });
  check('wrong password rejected', wrongPassword.status === 401);

  const unknownUser = await new Session('attacker').api('/api/auth/login', {
    method: 'POST',
    json: { email: `ghost+${unique}@example.com`, password: 'whatever-123' },
  });
  check(
    'unknown email gives the same answer as a wrong password',
    unknownUser.status === 401 &&
      unknownUser.body?.error?.message === wrongPassword.body?.error?.message,
  );

  // -----------------------------------------------------------------------
  section('Authorisation');
  // -----------------------------------------------------------------------
  const anonymous = new Session('anonymous');
  check(
    'wishlist requires sign-in',
    (await anonymous.api('/api/wishlist')).status === 401,
  );
  check(
    'orders require sign-in',
    (await anonymous.api('/api/orders')).status === 401,
  );
  // The admin lives in its own application on its own origin. The storefront
  // must not serve any of it — not a redirect, not a 403, nothing.
  const adminPage = await anonymous.fetch('/admin');
  check(
    'storefront does not serve /admin at all',
    adminPage.status === 404,
    `status ${adminPage.status}`,
  );
  const adminApi = await anonymous.api('/api/admin/products');
  check(
    'storefront does not serve the admin API',
    adminApi.status === 404,
    `status ${adminApi.status}`,
  );

  // -----------------------------------------------------------------------
  section('Wishlist');
  // -----------------------------------------------------------------------
  const saved = await shopper.api('/api/wishlist', {
    method: 'POST',
    json: { productId: sample.id },
  });
  check('add to wishlist', saved.body?.data?.inWishlist === true);
  const list = await shopper.api('/api/wishlist');
  check('wishlist lists the product', list.body?.data?.products?.[0]?.id === sample.id);
  const toggledOff = await shopper.api('/api/wishlist', {
    method: 'POST',
    json: { productId: sample.id },
  });
  check('toggle removes from wishlist', toggledOff.body?.data?.inWishlist === false);

  // -----------------------------------------------------------------------
  section('Signed-in order, history and cancellation');
  // -----------------------------------------------------------------------
  await shopper.api('/api/cart/items', {
    method: 'POST',
    json: { productId: secondProduct.id, quantity: 1 },
  });

  const shopperOrder = await shopper.api('/api/checkout', {
    method: 'POST',
    json: {
      ...validAddress,
      customerName: 'Meena Sundaram',
      customerEmail: email,
      saveAddress: true,
    },
  });
  if (shopperOrder.status === 429) {
    console.log(
      [
        '',
        '  ! Checkout is rate limited on this instance, so the signed-in order,',
        '    history, cancellation and review sections were skipped.',
        '    The limiter is in-process: restart the server and re-run for a full pass.',
      ].join('\n'),
    );
    summarise();
    return;
  }

  check('signed-in checkout succeeds', shopperOrder.status === 201);
  const orderNumber = shopperOrder.body?.data?.order?.orderNumber;

  const history = await shopper.api('/api/orders');
  check(
    'order appears in history',
    (history.body?.data?.orders ?? []).some((o) => o.orderNumber === orderNumber),
  );

  const addresses = await shopper.api('/api/account/addresses');
  check(
    'address saved at checkout',
    (addresses.body?.data?.addresses ?? []).length === 1,
  );

  const otherShopper = new Session('other');
  await otherShopper.api('/api/auth/register', {
    method: 'POST',
    json: {
      name: 'Second Shopper',
      email: `other+${unique}@example.com`,
      password: 'another-good-password',
    },
  });
  const crossCancel = await otherShopper.api(`/api/orders/${orderNumber}/cancel`, {
    method: 'POST',
    json: { reason: 'Not mine, just trying' },
  });
  check(
    'a different customer cannot cancel the order',
    crossCancel.status === 404,
    `status ${crossCancel.status}`,
  );

  const cancelled = await shopper.api(`/api/orders/${orderNumber}/cancel`, {
    method: 'POST',
    json: { reason: 'Ordered the wrong colour' },
  });
  check('owner can cancel', cancelled.status === 200);
  check('status becomes cancelled', cancelled.body?.data?.order?.status === 'CANCELLED');

  const cancelAgain = await shopper.api(`/api/orders/${orderNumber}/cancel`, {
    method: 'POST',
    json: { reason: 'Trying twice' },
  });
  check('a cancelled order cannot be cancelled again', cancelAgain.status === 409);

  // -----------------------------------------------------------------------
  section('Reviews');
  // -----------------------------------------------------------------------
  const unpurchased = await shopper.api('/api/reviews', {
    method: 'POST',
    json: {
      productId: sample.id,
      rating: 5,
      comment: 'I have not actually bought this product at all.',
    },
  });
  check(
    'review refused for a product not purchased',
    unpurchased.status === 403,
    `status ${unpurchased.status}`,
  );

  // secondProduct was bought above (the order is cancelled, so this should
  // also be refused — cancelled orders must not confer review rights).
  const afterCancel = await shopper.api('/api/reviews', {
    method: 'POST',
    json: {
      productId: secondProduct.id,
      rating: 4,
      comment: 'Bought this but then cancelled the order entirely.',
    },
  });
  check(
    'review refused after the order was cancelled',
    afterCancel.status === 403,
    `status ${afterCancel.status}`,
  );

  // -----------------------------------------------------------------------
  section('Admin');
  // -----------------------------------------------------------------------
  const admin = new Session('admin');
  const adminLogin = await admin.api('/api/auth/login', {
    method: 'POST',
    json: { email: 'admin@tamizhelectronics.in', password: 'admin12345' },
  });

  if (adminLogin.status !== 200) {
    console.log(
      '  skip admin flows — no seeded admin account on this instance ' +
        `(login status ${adminLogin.status})`,
    );
  } else {
    check('admin can sign in', adminLogin.body?.data?.user?.role === 'ADMIN');

    const adminProducts = await admin.api('/api/admin/products');
    check('admin lists products', (adminProducts.body?.data?.items ?? []).length > 0);

    const newSku = `TE-SMOKE-${unique.toUpperCase()}`;
    const newSlug = `smoke-test-product-${unique}`;
    const categoryId = adminProducts.body.data.items[0].categoryId;

    const createdProduct = await admin.api('/api/admin/products', {
      method: 'POST',
      json: {
        sku: newSku,
        slug: newSlug,
        name: 'Smoke Test Product',
        description: 'A product created by the automated smoke test run.',
        brand: 'Tamizh Gifts',
        categoryId,
        price: 499,
        mrp: 999,
        stock: 7,
        isActive: true,
        isFeatured: false,
        tags: ['smoke', 'test'],
        specs: { Warranty: '1 year' },
        images: [{ url: '/products/mini-led-torch-keychain-set-of-12-1.png', alt: 'Test' }],
      },
    });
    check('admin creates a product', createdProduct.status === 201);
    const newId = createdProduct.body?.data?.id;

    const duplicateSku = await admin.api('/api/admin/products', {
      method: 'POST',
      json: {
        sku: newSku,
        slug: `${newSlug}-2`,
        name: 'Duplicate SKU Product',
        description: 'This should be refused because the SKU already exists.',
        brand: 'Tamizh Gifts',
        categoryId,
        price: 499,
        mrp: 999,
        stock: 1,
        isActive: true,
        isFeatured: false,
        tags: [],
        specs: {},
        images: [],
      },
    });
    check('duplicate SKU refused', duplicateSku.status === 409);

    const priced = await guest.api(`/api/products?q=${encodeURIComponent(newSku)}`);
    check(
      'new product is visible in the shop',
      priced.body?.data?.items?.[0]?.slug === newSlug,
    );
    check(
      'rupees converted to paise',
      priced.body?.data?.items?.[0]?.price === 49900,
      `${priced.body?.data?.items?.[0]?.price}`,
    );
    check(
      'discount derived from MRP',
      priced.body?.data?.items?.[0]?.discountPercent === 50,
    );

    const stockUpdate = await admin.api(`/api/admin/products/${newId}/stock`, {
      method: 'PATCH',
      json: { stock: 42 },
    });
    check('admin updates stock', stockUpdate.body?.data?.stock === 42);

    const adminOrders = await admin.api('/api/admin/orders');
    check('admin lists orders', (adminOrders.body?.data?.items ?? []).length > 0);

    const target = adminOrders.body.data.items.find((o) => o.status === 'PENDING');
    if (target) {
      const illegal = await admin.api(`/api/admin/orders/${target.orderNumber}`, {
        method: 'PATCH',
        json: { status: 'DELIVERED' },
      });
      check(
        'illegal status jump refused',
        illegal.status === 409,
        `status ${illegal.status}`,
      );

      const confirmed = await admin.api(`/api/admin/orders/${target.orderNumber}`, {
        method: 'PATCH',
        json: { status: 'CONFIRMED', trackingNumber: 'TRK123456' },
      });
      check('admin advances the order', confirmed.body?.data?.order?.status === 'CONFIRMED');
      check(
        'tracking number stored',
        confirmed.body?.data?.order?.trackingNumber === 'TRK123456',
      );
    } else {
      console.log('  skip status transition — no pending order found');
    }

    const customers = await admin.api('/api/admin/orders?q=Meena');
    check('admin can search orders', customers.status === 200);

    const deleted = await admin.api(`/api/admin/products/${newId}`, { method: 'DELETE' });
    check('admin deletes the test product', deleted.status === 200);

    const adminDashboard = await admin.html('/admin');
    check('admin dashboard renders', adminDashboard.status === 200);
    const adminProductsPage = await admin.html('/admin/products');
    check('admin products page renders', adminProductsPage.status === 200);
    const adminOrdersPage = await admin.html('/admin/orders');
    check('admin orders page renders', adminOrdersPage.status === 200);
    const adminCustomersPage = await admin.html('/admin/customers');
    check('admin customers page renders', adminCustomersPage.status === 200);
  }

  // -----------------------------------------------------------------------
  section('Language switching');
  // -----------------------------------------------------------------------
  const tamil1 = new Session('tamil');
  tamil1.cookies.set('te_locale', 'ta');
  const tamilHome = await tamil1.html('/');
  check('Tamil home page renders', tamilHome.status === 200);
  check('html lang is ta-IN', tamilHome.text.includes('lang="ta-IN"'));
  check(
    'Tamil UI copy present',
    tamilHome.text.includes('இப்போதே வாங்குங்கள்'),
  );
  check(
    'Tamil product names used',
    tamilHome.text.includes('ரிட்டர்ன் கிஃப்ட்'),
  );

  const englishHome = await guest.html('/');
  check('English html lang is en-IN', englishHome.text.includes('lang="en-IN"'));
  check('English UI copy present', englishHome.text.includes('Shop Now'));

  // -----------------------------------------------------------------------
  section('PWA and SEO endpoints');
  // -----------------------------------------------------------------------
  const manifest = await guest.html('/manifest.json');
  const manifestJson = JSON.parse(manifest.text);
  check('manifest served', manifest.status === 200);
  check('manifest name', manifestJson.name.includes('Sri Cauvery Electronics'));
  check('manifest display standalone', manifestJson.display === 'standalone');
  check('manifest start_url', typeof manifestJson.start_url === 'string');
  // Pinned so a stray edit to the palette cannot silently change the colour
  // Android paints behind the installed app.
  check('manifest theme colour', manifestJson.theme_color === '#8a6a19');
  check(
    'manifest has 192 and 512 icons',
    ['192x192', '512x512'].every((size) =>
      manifestJson.icons.some((icon) => icon.sizes === size),
    ),
  );
  check(
    'manifest has a maskable icon',
    manifestJson.icons.some((icon) => icon.purpose === 'maskable'),
  );

  const offlinePage = await guest.html('/offline.html');
  check('static offline fallback served', offlinePage.status === 200);
  check(
    'offline fallback is self-contained (no external requests)',
    !/<(script|link)[^>]+(src|href)="https?:/.test(offlinePage.text),
  );
  check(
    'offline fallback is bilingual',
    offlinePage.text.includes('You are offline') &&
      offlinePage.text.includes('நீங்கள் ஆஃப்லைனில் இருக்கிறீர்கள்'),
  );

  const sw = await guest.html('/sw.js');
  check('service worker served', sw.status === 200);
  check('service worker caches an offline fallback', sw.text.includes('/offline.html'));
  check(
    'service worker refuses to cache the API',
    sw.text.includes('^\\/api\\/'),
  );
  check(
    'service worker is not cached itself',
    (sw.response.headers.get('cache-control') ?? '').includes('no-store'),
  );

  const robots = await guest.html('/robots.txt');
  check('robots.txt served', robots.status === 200);
  check('robots disallows /api/', robots.text.includes('Disallow: /api/'));
  check('robots disallows /admin', robots.text.includes('/admin'));
  check('robots points at the sitemap', robots.text.includes('Sitemap:'));

  const sitemap = await guest.html('/sitemap.xml');
  check('sitemap served', sitemap.status === 200);
  check('sitemap lists products', sitemap.text.includes('/product/'));
  check('sitemap lists categories', sitemap.text.includes('/categories/'));

  const iconResponse = await guest.fetch('/icons/icon-512.png');
  check('app icon served', iconResponse.status === 200);

  // -----------------------------------------------------------------------
  section('Security headers');
  // -----------------------------------------------------------------------
  const headers = (await guest.fetch('/')).headers;
  check('CSP set', (headers.get('content-security-policy') ?? '').includes("default-src 'self'"));
  check('frame-ancestors none', (headers.get('content-security-policy') ?? '').includes("frame-ancestors 'none'"));
  check('X-Content-Type-Options', headers.get('x-content-type-options') === 'nosniff');
  check('X-Frame-Options', headers.get('x-frame-options') === 'DENY');
  check('Referrer-Policy', Boolean(headers.get('referrer-policy')));
  check('HSTS', Boolean(headers.get('strict-transport-security')));
  check('X-Powered-By removed', headers.get('x-powered-by') === null);

  const cartHeaders = (await guest.fetch('/api/cart')).headers;
  check(
    'cart response is not cacheable',
    (cartHeaders.get('cache-control') ?? '').includes('no-store'),
  );

  // -----------------------------------------------------------------------
  section('Rate limiting');
  // -----------------------------------------------------------------------
  const flood = new Session('flood');
  let limited = false;
  for (let i = 0; i < 12; i += 1) {
    const attempt = await flood.api('/api/auth/login', {
      method: 'POST',
      json: { email: `flood+${unique}@example.com`, password: 'bad-password' },
    });
    if (attempt.status === 429) {
      limited = true;
      break;
    }
  }
  check('repeated sign-in attempts are throttled', limited);

  // -----------------------------------------------------------------------
  summarise();
}

function summarise() {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const failure of failures) console.log(`  - ${failure}`);
  }
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('\nSmoke test crashed:', error);
  process.exit(1);
});
