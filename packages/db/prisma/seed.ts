/**
 * Database seed.
 *
 * Loads the demo catalogue, the default permission matrix, store settings and
 * a set of staff accounts, so both applications can be exercised immediately
 * after `npm run db:deploy`.
 *
 *   npm run db:seed
 *
 * Written in erasable TypeScript so Node runs it directly with
 * `--experimental-strip-types` — no ts-node or tsx dependency.
 *
 * Idempotent: everything upserts on a natural key, so running it twice does
 * not duplicate anything. It never touches orders.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import {
  CATEGORY_SEED,
  COUPON_SEED,
  PRODUCT_SEED,
  REVIEW_SEED,
  paise,
} from './seed-data.ts';
import { DEFAULT_ROLE_MATRIX } from '../../core/src/permissions.ts';

for (const root of [process.cwd(), path.join(process.cwd(), '..', '..')]) {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) process.loadEnvFile(full);
  }
}

const connectionString =
  process.env.DATABASE_URL?.trim() ||
  'postgresql://postgres:postgres@127.0.0.1:55432/postgres';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Matches packages/core/crypto.ts. Synchronous is fine for a seed script. */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex');
  return ['scrypt', salt, derived].join('$');
}

const STAFF = [
  {
    email: 'owner@tamizhelectronics.in',
    name: 'Murugan Selvam',
    phone: '9840000001',
    role: 'SUPER_ADMIN' as const,
    password: 'Owner@Tamizh2026',
  },
  {
    email: 'manager@tamizhelectronics.in',
    name: 'Priya Anand',
    phone: '9840000002',
    role: 'MANAGER' as const,
    password: 'Manager@Tamizh26',
  },
  {
    email: 'stock@tamizhelectronics.in',
    name: 'Ravi Kumar',
    phone: '9840000003',
    role: 'INVENTORY_MANAGER' as const,
    password: 'Stock@Tamizh2026',
  },
  {
    email: 'orders@tamizhelectronics.in',
    name: 'Divya Rajan',
    phone: '9840000004',
    role: 'ORDER_MANAGER' as const,
    password: 'Orders@Tamizh26',
  },
  {
    email: 'support@tamizhelectronics.in',
    name: 'Karthik Vel',
    phone: '9840000005',
    role: 'SUPPORT_STAFF' as const,
    password: 'Support@Tamizh26',
  },
];

const DEMO_CUSTOMER = {
  email: 'customer@example.com',
  name: 'Karthik Raman',
  phone: '9840011111',
  password: 'customer12345',
};

async function main(): Promise<void> {
  console.log('Seeding Sri Cauvery Electronics…\n');

  // -- store settings -------------------------------------------------------
  await prisma.storeSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', gstin: '33ABCDE1234F1Z5' },
    update: {},
  });
  console.log('  settings: ready');

  // -- permission matrix ----------------------------------------------------
  // Seeded from code so a fresh database matches the documented defaults; a
  // SUPER_ADMIN can then change any row without a deploy.
  let permissionRows = 0;
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_MATRIX)) {
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role: role as never, permission } },
        create: { role: role as never, permission, allowed: true },
        update: {},
      });
      permissionRows += 1;
    }
  }
  console.log(`  permissions: ${permissionRows} role grants`);

  // -- staff ----------------------------------------------------------------
  for (const member of STAFF) {
    await prisma.adminUser.upsert({
      where: { email: member.email },
      create: {
        email: member.email,
        name: member.name,
        phone: member.phone,
        role: member.role,
        passwordHash: hashPassword(member.password),
      },
      update: { role: member.role, isActive: true },
    });
  }
  console.log(`  staff: ${STAFF.length} accounts`);

  // -- categories (parents first) -------------------------------------------
  const categoryIds = new Map<string, string>();
  const saveCategory = async (category: (typeof CATEGORY_SEED)[number]) => {
    const parentId = category.parentSlug
      ? (categoryIds.get(category.parentSlug) ?? null)
      : null;
    const data = {
      name: category.name,
      nameTa: category.nameTa,
      description: category.description,
      descriptionTa: category.descriptionTa,
      icon: category.icon,
      imageUrl: `/categories/${category.slug}.png`,
      sortOrder: category.sortOrder,
      parentId,
    };
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      create: { slug: category.slug, ...data },
      update: data,
      select: { id: true },
    });
    categoryIds.set(category.slug, saved.id);
  };

  for (const category of CATEGORY_SEED.filter((row) => !row.parentSlug)) {
    await saveCategory(category);
  }
  for (const category of CATEGORY_SEED.filter((row) => row.parentSlug)) {
    await saveCategory(category);
  }
  console.log(`  categories: ${categoryIds.size}`);

  // -- products -------------------------------------------------------------
  const productIds = new Map<string, string>();
  for (const product of PRODUCT_SEED) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      console.warn(`  ! unknown category "${product.categorySlug}" for ${product.sku}`);
      continue;
    }

    const createdAt = new Date(Date.now() - product.addedDaysAgo * 86_400_000);
    // A plausible margin so the admin's profit reporting has something to show.
    const costPrice = Math.round(paise(product.price) * 0.68);

    const data = {
      slug: product.slug,
      name: product.name,
      nameTa: product.nameTa,
      description: product.description,
      descriptionTa: product.descriptionTa,
      brand: product.brand,
      price: paise(product.price),
      mrp: paise(product.mrp),
      costPrice,
      taxBps: 1800,
      stock: product.stock,
      lowStockThreshold: product.stock > 60 ? 15 : 5,
      status: 'ACTIVE' as const,
      isFeatured: product.isFeatured ?? false,
      isNewArrival: product.addedDaysAgo <= 40,
      isBestSeller: product.soldCount >= 900,
      tags: product.tags,
      specs: product.specs,
      // Illustrative figures, so a fresh install does not look abandoned.
      // They are a cache of the approved reviews: the moment a review for this
      // product is moderated in the admin panel, both are recomputed from the
      // real ones and these demo numbers are gone for good.
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      soldCount: product.soldCount,
      categoryId,
      publishedAt: createdAt,
      createdAt,
    };

    // Re-seeding must not rewrite live counts. Stock is owned by the inventory
    // ledger — every movement has a row, and the sum of those rows has to equal
    // the stored count. Overwriting it here would silently break that, so both
    // stock and the units-sold counter are set on create only.
    const { stock: openingStock, soldCount, ...updatable } = data;

    const saved = await prisma.product.upsert({
      where: { sku: product.sku },
      create: { sku: product.sku, stock: openingStock, soldCount, ...updatable },
      update: updatable,
      select: { id: true },
    });
    productIds.set(product.slug, saved.id);

    // Images are replaced wholesale — simpler and safer than diffing.
    await prisma.productImage.deleteMany({ where: { productId: saved.id } });
    await prisma.productImage.createMany({
      data: [
        {
          productId: saved.id,
          url: `/products/${product.slug}-1.png`,
          alt: product.name,
          sortOrder: 0,
          isPrimary: true,
        },
        {
          productId: saved.id,
          url: `/products/${product.slug}-2.png`,
          alt: `${product.name} — alternate view`,
          sortOrder: 1,
        },
      ],
    });
  }
  console.log(`  products: ${productIds.size}`);

  // -- opening stock ---------------------------------------------------------
  // Every product's starting quantity is recorded as a real movement, so the
  // stock ledger reconciles from the very first unit rather than starting with
  // an unexplained balance.
  // Checked per product rather than globally, so a product added to the seed
  // later still gets its opening entry on a re-run instead of quietly starting
  // with stock the ledger cannot explain.
  const owner = await prisma.adminUser.findUnique({
    where: { email: STAFF[0]!.email },
    select: { id: true },
  });
  const products = await prisma.product.findMany({
    select: { id: true, stock: true, _count: { select: { stockMoves: true } } },
  });
  const needOpening = products.filter(
    (product) => product._count.stockMoves === 0 && product.stock > 0,
  );
  if (needOpening.length > 0) {
    await prisma.inventoryTransaction.createMany({
      data: needOpening.map((product) => ({
        productId: product.id,
        change: product.stock,
        quantityBefore: 0,
        quantityAfter: product.stock,
        reason: 'PURCHASE' as const,
        note: 'Opening stock',
        actorId: owner?.id ?? null,
      })),
    });
    console.log(`  stock ledger: ${needOpening.length} opening entries`);
  }

  // -- coupons --------------------------------------------------------------
  for (const coupon of COUPON_SEED) {
    // PERCENT coupons are stored as basis points so fractional percentages
    // are expressible without floats.
    const data = {
      description: coupon.description,
      type: coupon.type,
      value: coupon.type === 'PERCENT' ? coupon.value * 100 : paise(coupon.value),
      minOrder: paise(coupon.minOrder),
      maxDiscount: coupon.maxDiscount ? paise(coupon.maxDiscount) : null,
      usageLimit: coupon.usageLimit ?? null,
      perUserLimit: 1,
      isActive: true,
    };
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      create: { code: coupon.code, ...data },
      update: data,
    });
  }
  console.log(`  coupons: ${COUPON_SEED.length}`);

  // -- shipping zones -------------------------------------------------------
  const zones = [
    {
      name: 'Madurai city',
      pincodePrefixes: ['625'],
      minDeliveryDays: 1,
      maxDeliveryDays: 2,
      sortOrder: 1,
    },
    {
      name: 'Tamil Nadu',
      pincodePrefixes: ['60', '61', '62', '63', '64'],
      minDeliveryDays: 2,
      maxDeliveryDays: 4,
      sortOrder: 2,
    },
    {
      name: 'Rest of India',
      pincodePrefixes: [],
      minDeliveryDays: 4,
      maxDeliveryDays: 7,
      sortOrder: 3,
    },
  ];
  for (const zone of zones) {
    const existing = await prisma.shippingZone.findFirst({ where: { name: zone.name } });
    if (existing) await prisma.shippingZone.update({ where: { id: existing.id }, data: zone });
    else await prisma.shippingZone.create({ data: zone });
  }
  console.log(`  shipping zones: ${zones.length}`);

  // -- homepage banners -----------------------------------------------------
  const banners = [
    {
      placement: 'HERO' as const,
      title: 'Everyday electronics. Unforgettable gifts.',
      titleTa: 'அன்றாட மின்னணுப் பொருட்கள். மறக்க முடியாத பரிசுகள்.',
      subtitle: 'Free delivery over ₹499 across Tamil Nadu',
      subtitleTa: 'தமிழ்நாடு முழுவதும் ₹499 மேல் இலவச டெலிவரி',
      ctaLabel: 'Shop Now',
      ctaLabelTa: 'இப்போதே வாங்குங்கள்',
      ctaHref: '/shop',
      sortOrder: 1,
    },
    {
      placement: 'PROMO_STRIP' as const,
      title: 'Return gifts for every function',
      titleTa: 'ஒவ்வொரு நிகழ்விற்கும் ரிட்டர்ன் கிஃப்ட்',
      subtitle: 'Bulk pricing, neat packing, on-time delivery',
      subtitleTa: 'மொத்த விலை, நேர்த்தியான பேக்கிங், சரியான நேரத்தில் டெலிவரி',
      ctaLabel: 'Explore',
      ctaLabelTa: 'பார்க்க',
      ctaHref: '/categories/return-gifts',
      sortOrder: 2,
    },
  ];
  for (const banner of banners) {
    const existing = await prisma.banner.findFirst({
      where: { placement: banner.placement, title: banner.title },
    });
    if (!existing) await prisma.banner.create({ data: banner });
  }
  console.log(`  banners: ${banners.length}`);

  // -- demo customer --------------------------------------------------------
  const customer = await prisma.user.upsert({
    where: { email: DEMO_CUSTOMER.email },
    create: {
      email: DEMO_CUSTOMER.email,
      name: DEMO_CUSTOMER.name,
      phone: DEMO_CUSTOMER.phone,
      passwordHash: hashPassword(DEMO_CUSTOMER.password),
    },
    update: {},
    select: { id: true },
  });

  await prisma.address.deleteMany({ where: { userId: customer.id } });
  await prisma.address.create({
    data: {
      userId: customer.id,
      fullName: DEMO_CUSTOMER.name,
      phone: DEMO_CUSTOMER.phone,
      line1: '12, Gandhi Nagar 3rd Street',
      line2: 'Near Water Tank',
      city: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641012',
      isDefault: true,
    },
  });

  // -- demo reviews ---------------------------------------------------------
  let reviewCount = 0;
  for (const review of REVIEW_SEED) {
    const productId = productIds.get(review.productSlug);
    if (!productId) continue;
    await prisma.review.upsert({
      where: { productId_userId: { productId, userId: customer.id } },
      create: {
        productId,
        userId: customer.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        status: 'APPROVED',
        createdAt: new Date(Date.now() - review.daysAgo * 86_400_000),
      },
      update: { rating: review.rating, title: review.title, comment: review.comment },
    });
    reviewCount += 1;
  }
  console.log(`  customer + ${reviewCount} reviews`);

  console.log('\nStaff sign-ins (admin app):');
  for (const member of STAFF) {
    console.log(`  ${member.role.padEnd(18)} ${member.email}  ${member.password}`);
  }
  console.log(`\nCustomer sign-in (storefront):`);
  console.log(`  ${DEMO_CUSTOMER.email}  ${DEMO_CUSTOMER.password}`);
  console.log('\nChange every one of these before going live.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
