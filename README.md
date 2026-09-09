# Sri Cauvery Electronics — ஸ்ரீ காவேரி மின்னணுவியல்

Two Progressive Web Apps for an Indian electronics and return-gift shop, sharing
one PostgreSQL database:

| App                      | Port | Who it is for | Lives in          |
| ------------------------ | ---- | ------------- | ----------------- |
| **Storefront**           | 3000 | Shoppers      | `apps/storefront` |
| **Admin panel**          | 3001 | Shop staff    | `apps/admin`      |

Both are bilingual (Tamil / English), mobile-first, installable, and honest
about what they cannot do offline.

> **Electronics & Gifts for Every Occasion**
> ஒவ்வொரு நிகழ்விற்கும் மின்னணுவியல் & பரிசுகள்

---

## Quick start

```bash
npm install
npm run dev
```

That starts a local PostgreSQL **and** the storefront on
<http://localhost:3000>. For the admin panel:

```bash
npm run dev:admin
```

then open <http://localhost:3001>.

No database installation is needed. `npm run dev:db` runs PGlite behind the
PostgreSQL wire protocol — a real PostgreSQL 18 with real transactions, real
`pg_trgm` search and real rollback, stored under `packages/db/.pglite`. The apps
connect to it with the ordinary `pg` driver and cannot tell the difference.

Seed the demo shop (44 products, 20 categories, coupons, staff, a customer):

```bash
npm run db:seed
```

### Demo sign-ins

**Storefront** — `customer@example.com` / `customer12345`

**Admin panel**

| Role              | Email                            | Password           |
| ----------------- | -------------------------------- | ------------------ |
| Owner             | `owner@tamizhelectronics.in`     | `Owner@Tamizh2026` |
| Manager           | `manager@tamizhelectronics.in`   | `Manager@Tamizh26` |
| Inventory manager | `stock@tamizhelectronics.in`     | `Stock@Tamizh2026` |
| Order manager     | `orders@tamizhelectronics.in`    | `Orders@Tamizh26`  |
| Support staff     | `support@tamizhelectronics.in`   | `Support@Tamizh26` |

**Change every one of these before deploying anything.**

---

## Scripts

| Command                 | What it does                                          |
| ----------------------- | ----------------------------------------------------- |
| `npm run dev`           | Local database + storefront on :3000                  |
| `npm run dev:admin`     | Admin panel on :3001                                  |
| `npm run dev:db`        | Just the local PostgreSQL                             |
| `npm run build`         | Production build of both apps                         |
| `npm run check`         | TypeScript + ESLint across the workspace              |
| `npm run smoke`         | 121 HTTP assertions against the storefront            |
| `npm run smoke:admin`   | 71 HTTP assertions against the admin panel            |
| `npm run db:migrate`    | `prisma migrate dev`                                  |
| `npm run db:deploy`     | `prisma migrate deploy` (production)                  |
| `npm run db:seed`       | Seed the catalogue, staff and settings                |
| `npm run db:studio`     | Prisma Studio                                         |
| `npm run icons`         | Rebuild every app icon from `logo/logo.jpeg`           |
| `npm run vapid -w @tamizh/admin` | Generate Web Push keys                       |
| `npm run check:push -w @tamizh/admin` | Verify the Web Push implementation      |

---

## Layout

```
apps/
  storefront/          the shop customers see
  admin/               the panel staff use
packages/
  core/                money, pricing, permissions, validation, crypto, API envelope
  db/                  Prisma schema, migrations, seed, local PostgreSQL
```

`packages/core` holds everything both apps must agree on — how money is
represented, how a coupon is evaluated, what each role may do — so the two can
never drift apart on a rule that matters.

### One database, one source of truth

Nothing about products, orders, stock or customers is duplicated between the
apps. The admin writes; the storefront reads the same rows. A price change is
live on the shop as soon as it is saved, and the shop's delivery charge, free
delivery threshold, minimum order and return window are all read from the
settings row the panel edits — no deploy, no code change.

The only place the two applications talk directly is a single authenticated
server-to-server endpoint (`/api/admin/internal/notify`) that the shop uses to
ask the panel to raise a staff alert when an order or a return arrives.

### Money

Every amount is an integer number of **paise** (₹1 = 100 paise), end to end.
Percentages — tax rates, percentage coupons — are integer **basis points**
(1000 = 10%). No floats anywhere near a total. Rupees exist only at the edges:
what a person types into a form, and what is rendered on screen.

### Pricing and trust

The browser never sends a price. Checkout receives contact details, an address
and a payment method; line items, discounts, coupon value, delivery and the
total are all recomputed on the server. Coupons live in a cookie as a *code* and
are re-evaluated on every read. Stock is re-checked inside the order transaction
before it is decremented. The admin API applies the same rule to itself: a
selling price above the M.R.P. is refused server-side, not merely disabled in
the form.

### Stock is a ledger

Stock never moves without an `InventoryTransaction` row written in the same
transaction — a sale, a cancellation, a manual correction, a returned item put
back on the shelf. The sum of a product's movements equals its stored count, and
the inventory screen says so out loud when it does not. Re-running the seed
deliberately leaves live counts alone for the same reason.

---

## The admin panel

Sixteen screens, all permission-gated: dashboard, orders, payments, returns,
refunds, products, categories, inventory, coupons, reviews, customers, reports,
notifications, website content, delivery zones, staff, roles, settings, audit
log and search.

### Roles and permissions

Six roles — owner, administrator, manager, inventory manager, order manager,
support staff — resolved through three layers, most specific first: a per-user
denial, a per-user grant, the role's stored permissions, then the built-in
default. A denial always wins. The owner role always holds everything, which is
what makes a mistake in the roles editor recoverable.

Nobody can assign a role they do not hold, disable their own account, or change
their own role. Disabling someone, changing their role or resetting their
password ends every session they have open — immediately, not at cookie expiry.

Server-side checks are the control; the UI hiding a button is a convenience.
Every `/api/admin/*` handler re-checks the permission itself.

### Sessions

Admin sessions are **rows in the database**, not stateless cookies: 12 hours
long, 4 hours idle, revocable. The cookie carries a random token and only its
SHA-256 is stored, so a database leak does not hand over live sessions. The
identity is re-read on every request, memoised per request — never per process,
which would keep a revoked session alive until a restart.

### Audit log

Every privileged action is recorded with who did it, what changed from and to,
and from which address: price changes (their own entry, separately from other
edits), stock movements, refunds, role changes, settings, exports. The panel can
read the log; it cannot edit or delete it.

### Money handling

Raising a refund and approving one are separate permissions, and marking a
refund paid requires a transaction reference — so the person authorising money
out is not automatically the person recording that it went. A refund is capped
server-side at what the order actually has left to refund. A partly refunded
order stays a delivered order; only a full refund changes its status.

### Reports and export

Sales over time, by category, by product, by payment method and by status, with
margin against current cost price. CSV export of orders, daily sales, product
performance and current stock. Exports deliberately omit customer email
addresses, phone numbers and street addresses, and every export is written to
the audit log. Cells beginning `=`, `+`, `-` or `@` are prefixed so a spreadsheet
cannot treat exported data as a formula.

### Web Push

Written against RFC 8291 and RFC 8292 with nothing but `node:crypto`: VAPID
ES256 JWTs, ECDH key agreement, HKDF and aes128gcm. `npm run check:push -w
@tamizh/admin` sends a real notification to a local listener and decrypts it
with the subscriber's own key, so the implementation is verified end to end
rather than assumed.

Notification text never carries a customer name, phone number or address —
these land on lock screens.

---

## Bilingual support

`i18n/en.ts` is the source of truth for the key set in each app; `ta.ts` is
typed as `Dictionary`, so **adding an English key fails the build until it is
translated**. The locale lives in a cookie, is read server-side, and is handed
to the client as a resolved dictionary — the first paint is already in the right
language and no translation bundle is fetched.

Typography stacks Manrope (Inter in the panel) with Noto Sans Tamil, so mixed
strings resolve each script to the right face without switching families per
string. Tamil gets its own line-height and tracking, because Tamil descenders
collide at Latin line-heights in dense layouts.

---

## PWA

Both apps ship a manifest, a service worker and a bilingual offline page.

**Storefront** — navigations network-first (never a stale price), static assets
stale-while-revalidate, images cache-first with an LRU trim.

**Admin** — network-first for pages, and any page served from cache gets a
banner injected saying so, so a cached figure can never pass for a live one.

**Neither worker ever caches `/api/*` or the sign-in page.** Orders, payments,
customer records and stock levels are never written to Cache Storage.

Offline, the panel refuses mutations outright rather than attempting them: an
administrator must never be left unsure whether a refund, a stock change or an
order update went through. The offline page says plainly that nothing can be
saved.

### Verifying offline behaviour

1. Start a server, load the app, visit a few pages.
2. Stop the server (or DevTools → Network → Offline).
3. Revisit a page you opened — it renders from cache, with a stale banner in the
   panel.
4. Visit one you did not — the bilingual offline page appears.
5. Try to save something — it is refused, and says so.

---

## Payments

`services/payments.ts` is a provider interface, not a gateway integration.

- `cod` — cash on delivery, always available
- `mock` — default; exercises the full online-payment path with no credentials
  and never claims money was captured
- `razorpay` — set `PAYMENT_PROVIDER=razorpay` plus `RAZORPAY_KEY_ID`,
  `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`

Checkout code does not change when you switch. Secrets are read on the server
only; the publishable key id is the sole value that reaches the browser. Online
payment is hidden from checkout until the gateway is actually configured.

---

## Testing

```bash
npm run check          # TypeScript + ESLint across the workspace
npm run smoke          # storefront, 121 assertions
npm run smoke:admin    # admin panel, 71 assertions
npm run build          # production build of both apps
```

Both suites drive a running server over HTTP with a real cookie jar. The admin
suite signs in, loads every screen, and — the part that matters — checks what
must be refused: an anonymous request, a wrong password, a stock change without
a reason, stock below zero, a price above the M.R.P., a refund on an unknown
order, a staff alert without the shared secret, an unknown report.

The sign-in limiter is in-process and per-IP, so a second run inside the window
is legitimately throttled; the suite says so and stops rather than reporting
false failures.

### Known limitations of this environment

The visual design was verified through the DOM, computed styles, viewport
metrics and the compiled CSS rather than by eye — no browser capable of
rendering screenshots was available on the machine this was built on. Please
review the result on a real device.

---

## Security

- All input validated with zod on the server; nothing from the browser trusted
- Prices, discounts, stock and refund ceilings recomputed server-side
- scrypt password hashing, constant-time comparison, no user enumeration
- Admin sessions stored and revocable; identity re-read on every request
- Separate signing secrets for shoppers and staff
- Rate limiting on sign-in, registration, checkout, coupons, contact, reviews
  and password changes
- Strict CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `no-referrer` and
  `noindex` on the panel
- Uploads accepted only after sniffing magic bytes; filenames generated, never
  taken from the client
- A blocked customer cannot sign in, and cannot check out on a session opened
  before they were blocked
- Order-status and return transitions validated against a state machine
- Products and coupons with history are retired, never deleted
- Secrets only in environment variables, never in a client bundle

---

## Artwork

### Icons and the share card

`npm run icons` cuts every app icon from `logo/logo.jpeg` — the shop's own
crest. It crops away the wordmark (four grey pixels at favicon size), keeps the
crest inside the safe zone for Android's maskable icons, writes a real
`favicon.ico`, and produces the Open Graph card. Replace `logo/logo.jpeg` and
re-run it; nothing else needs editing.

The admin's icons carry a bronze bar along the bottom so staff with both apps
installed can tell them apart on a home screen.

### The palette

Gold on black, taken from the crest, in two halves: `brand` is the bronze end
and carries white text, `gold` is the luminous end and carries near-black text.
Gold with white on it is the one pairing this palette never makes. Every step
was checked against WCAG rather than picked by eye — white on `brand-600` is
5.05:1, a `brand-700` link on white is 7.17:1.

### Product photography

`npm run assets` generates the placeholder product and category images from
`scripts/lib/raster.mjs` — a small software rasteriser and PNG encoder written
for this project. No image library, no stock photography, no external hosts.
Replace them with real photography by uploading through the admin panel.

---

## Deployment

Deploy the two apps to separate hosts — your shop domain and an `admin.`
subdomain of it — pointing at the same database.

1. Provision PostgreSQL and set `DATABASE_URL` for both apps.
2. Storefront: set `AUTH_SECRET` and `NEXT_PUBLIC_SITE_URL`.
3. Admin: copy `apps/admin/.env.example`, set `ADMIN_AUTH_SECRET` (a *different*
   secret), `ADMIN_SITE_URL` and `NEXT_PUBLIC_SITE_URL`.
4. Set the same `INTERNAL_NOTIFY_SECRET` in both, so the shop can raise staff
   alerts.
5. Optionally generate Web Push keys: `npm run vapid -w @tamizh/admin`.
6. `npm run db:deploy`, then `npm run db:seed` on a fresh database.
7. `npm run build && npm start -w @tamizh/storefront` (and `-w @tamizh/admin`).

The build does not need a live database — the sitemap is generated per request
precisely so a deploy pipeline never has to connect to one. `prisma generate`
runs from `postinstall` and again at the start of each app's build, so the
generated client is never missing on a clean checkout.

Serve both over HTTPS: service workers, installability, Web Push and `Secure`
cookies all require it.

### On Vercel

**Two projects, not one.** Vercel deploys a single Next.js app per project, and
this repository holds two. Create both from the same repository and set the
**Root Directory** for each:

| Project    | Root Directory     | Domain                    |
| ---------- | ------------------ | ------------------------- |
| storefront | `apps/storefront`  | your shop domain          |
| admin      | `apps/admin`       | `admin.` subdomain        |

Leave the build and install commands on their defaults — with the root
directory set, Vercel installs the workspace from the repository root and runs
that app's own `build`. Pointing a project at the repository root instead makes
it try to build both apps into one deployment, which fails.

Add the environment variables from step 2–5 above to each project separately.

**Uploads need object storage.** Vercel's filesystem is read-only apart from a
per-invocation `/tmp`, so the default `STORAGE_PROVIDER=local` cannot keep an
uploaded product photo. The panel refuses the upload with a clear message
rather than accepting a file that will vanish — set `STORAGE_PROVIDER=s3` and
point it at a bucket before adding real photography.
