import 'server-only';
import { getPrisma } from '@tamizh/db';
import type {
  AddressInput,
  AddressView,
  CartItemView,
  CategoryView,
  OrderStatus,
  OrderView,
  PaymentStatus,
  ProductCardView,
  ProductDetailView,
  ProductQuery,
  ProductSearchResult,
} from '@tamizh/core/types';
import { discountPercent } from '@tamizh/core/money';
import { AppError, notFound } from '@tamizh/core/api';
import type { CouponRule } from '@tamizh/core/pricing';
import { CANCELLABLE_STATUSES } from '@tamizh/core/pricing';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_QUANTITY_PER_ITEM,
} from '../constants';
import type {
  CartOwner,
  CreateUserInput,
  PlaceOrderInput,
  Repository,
  ResolvedCart,
  ReturnEligibility,
  ReturnRequestInput,
  UserRecord,
} from './types';

/**
 * PostgreSQL-backed repository (production).
 *
 * Rules of the house:
 *  - Selling prices, discounts and stock are read from the database inside the
 *    same request that uses them; the browser never supplies an amount.
 *  - Order placement runs in a transaction that re-checks stock before it
 *    decrements, so two shoppers cannot buy the last unit.
 *  - Rows are mapped into view models before leaving this file.
 */

/** Columns needed to render a product card. */
const cardSelect = {
  id: true,
  slug: true,
  sku: true,
  name: true,
  nameTa: true,
  brand: true,
  price: true,
  mrp: true,
  stock: true,
  ratingAvg: true,
  ratingCount: true,
  isFeatured: true,
  images: {
    orderBy: { sortOrder: 'asc' },
    take: 1,
    select: { url: true, alt: true, width: true, height: true },
  },
  category: { select: { slug: true, name: true, nameTa: true } },
} as const;

type CardRow = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  nameTa: string | null;
  brand: string;
  price: number;
  mrp: number;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  isFeatured: boolean;
  images: { url: string; alt: string; width: number; height: number }[];
  category: { slug: string; name: string; nameTa: string } | null;
};

function toCard(row: CardRow): ProductCardView {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    nameTa: row.nameTa,
    brand: row.brand,
    price: row.price,
    mrp: row.mrp,
    discountPercent: discountPercent(row.mrp, row.price),
    stock: row.stock,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    image: row.images[0] ?? null,
    categorySlug: row.category?.slug ?? '',
    categoryName: row.category?.name ?? '',
    isFeatured: row.isFeatured,
  };
}

function asSpecs(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string') out[key] = raw;
    else if (raw != null) out[key] = String(raw);
  }
  return out;
}

export class PrismaRepository implements Repository {
  readonly backend = 'postgres' as const;

  private get db() {
    return getPrisma();
  }

  // -------------------------------------------------------------------------
  // Catalogue
  // -------------------------------------------------------------------------

  async listCategoryTree(): Promise<CategoryView[]> {
    const rows = await this.db.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });

    const byId = new Map(rows.map((row) => [row.id, row]));
    const countFor = (categoryId: string): number => {
      let total = 0;
      for (const row of rows) {
        if (row.id === categoryId || row.parentId === categoryId) {
          total += row._count.products;
        }
      }
      return total;
    };

    const view = (row: (typeof rows)[number]): CategoryView => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameTa: row.nameTa,
      description: row.description,
      descriptionTa: row.descriptionTa,
      icon: row.icon,
      imageUrl: row.imageUrl,
      parentId: row.parentId,
      productCount: countFor(row.id),
    });

    return rows
      .filter((row) => row.parentId === null || !byId.has(row.parentId))
      .map((root) => ({
        ...view(root),
        children: rows.filter((row) => row.parentId === root.id).map(view),
      }));
  }

  async listCategoriesFlat(): Promise<CategoryView[]> {
    const rows = await this.db.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameTa: row.nameTa,
      description: row.description,
      descriptionTa: row.descriptionTa,
      icon: row.icon,
      imageUrl: row.imageUrl,
      parentId: row.parentId,
      productCount: row._count.products,
    }));
  }

  async getCategoryBySlug(slug: string): Promise<CategoryView | null> {
    const row = await this.db.category.findUnique({
      where: { slug },
      include: {
        _count: { select: { products: true } },
        children: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { products: true } } },
        },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameTa: row.nameTa,
      description: row.description,
      descriptionTa: row.descriptionTa,
      icon: row.icon,
      imageUrl: row.imageUrl,
      parentId: row.parentId,
      productCount:
        row._count.products +
        row.children.reduce((sum, child) => sum + child._count.products, 0),
      children: row.children.map((child) => ({
        id: child.id,
        slug: child.slug,
        name: child.name,
        nameTa: child.nameTa,
        description: child.description,
        descriptionTa: child.descriptionTa,
        icon: child.icon,
        imageUrl: child.imageUrl,
        parentId: child.parentId,
        productCount: child._count.products,
      })),
    };
  }

  /** Category id plus its immediate children (the tree is two levels deep). */
  private async categoryIdsForSlugs(slugs: string[]): Promise<string[] | null> {
    if (slugs.length === 0) return null;
    const roots = await this.db.category.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, children: { select: { id: true } } },
    });
    if (roots.length === 0) return [];
    return roots.flatMap((root) => [root.id, ...root.children.map((c) => c.id)]);
  }

  private async buildProductWhere(query: ProductQuery) {
    const where: Record<string, unknown> = { status: 'ACTIVE', deletedAt: null };
    const and: Record<string, unknown>[] = [];

    const slugs = [
      ...(query.category ? [query.category] : []),
      ...(query.categories ?? []),
    ];
    if (slugs.length > 0) {
      const ids = await this.categoryIdsForSlugs(slugs);
      // An unknown slug must match nothing rather than everything.
      and.push({ categoryId: { in: ids ?? [] } });
    }

    if (query.q) {
      const term = query.q.trim();
      and.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { nameTa: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
          { brand: { contains: term, mode: 'insensitive' } },
          { tags: { has: term.toLowerCase() } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    if (query.brands?.length) and.push({ brand: { in: query.brands } });
    if (query.minPrice !== undefined) and.push({ price: { gte: query.minPrice } });
    if (query.maxPrice !== undefined) and.push({ price: { lte: query.maxPrice } });
    if (query.minRating !== undefined) and.push({ ratingAvg: { gte: query.minRating } });
    if (query.inStockOnly) and.push({ stock: { gt: 0 } });
    if (query.featured) and.push({ isFeatured: true });

    if (and.length > 0) where.AND = and;
    return where;
  }

  async searchProducts(query: ProductQuery): Promise<ProductSearchResult> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE),
    );
    const where = (await this.buildProductWhere(query)) as never;

    /**
     * Discount is derived (mrp vs price) and not stored, so it cannot be a SQL
     * predicate without a generated column. It is applied after fetching, and
     * the page is fetched large enough that the common filters still paginate
     * correctly.
     */
    const discountFilter = query.minDiscount ?? 0;

    const orderBy = (() => {
      switch (query.sort) {
        case 'price-asc':
          return [{ price: 'asc' as const }];
        case 'price-desc':
          return [{ price: 'desc' as const }];
        case 'newest':
          return [{ createdAt: 'desc' as const }];
        case 'rating':
          return [{ ratingAvg: 'desc' as const }, { ratingCount: 'desc' as const }];
        case 'best-selling':
          return [{ soldCount: 'desc' as const }];
        default:
          // Postgres relevance ranking would need a tsvector column; until the
          // catalogue justifies that, popularity is the pragmatic tie-break.
          return [{ soldCount: 'desc' as const }, { ratingAvg: 'desc' as const }];
      }
    })();

    const [total, rows, brandGroups, categoryGroups, priceRange] = await Promise.all([
      this.db.product.count({ where }),
      this.db.product.findMany({
        where,
        orderBy,
        select: cardSelect as never,
        ...(discountFilter > 0
          ? {}
          : { skip: (page - 1) * pageSize, take: pageSize }),
      }),
      this.db.product.groupBy({ by: ['brand'], where, _count: { _all: true } }),
      this.db.product.groupBy({ by: ['categoryId'], where, _count: { _all: true } }),
      this.db.product.aggregate({ where, _min: { price: true }, _max: { price: true } }),
    ]);

    let items = (rows as unknown as CardRow[]).map(toCard);
    let count = total;
    if (discountFilter > 0) {
      items = items.filter((item) => item.discountPercent >= discountFilter);
      count = items.length;
      items = items.slice((page - 1) * pageSize, page * pageSize);
    }

    const categoryRows = await this.db.category.findMany({
      where: { id: { in: categoryGroups.map((group) => group.categoryId) } },
      select: { id: true, slug: true, name: true, nameTa: true },
    });
    const categoryById = new Map(categoryRows.map((row) => [row.id, row]));

    return {
      items,
      total: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
      facets: {
        categories: categoryGroups
          .map((group) => {
            const category = categoryById.get(group.categoryId);
            return {
              value: category?.slug ?? group.categoryId,
              label: category?.name ?? '',
              labelTa: category?.nameTa,
              count: group._count._all,
            };
          })
          .filter((facet) => facet.label !== '')
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
        brands: brandGroups
          .map((group) => ({
            value: group.brand,
            label: group.brand,
            count: group._count._all,
          }))
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
        priceMin: priceRange._min.price ?? 0,
        priceMax: priceRange._max.price ?? 0,
      },
    };
  }

  async getProductBySlug(slug: string): Promise<ProductDetailView | null> {
    const row = await this.db.product.findFirst({
      where: { slug, status: 'ACTIVE', deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        category: true,
        reviews: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { name: true } } },
        },
      },
    });
    if (!row) return null;

    return {
      ...toCard({
        ...row,
        images: row.images,
        category: row.category,
      } as unknown as CardRow),
      description: row.description,
      descriptionTa: row.descriptionTa,
      tags: row.tags,
      specs: asSpecs(row.specs),
      soldCount: row.soldCount,
      images: row.images.map((image) => ({
        url: image.url,
        alt: image.alt,
        width: image.width,
        height: image.height,
      })),
      variants: row.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        price: variant.price,
        stock: variant.stock,
        attributes: asSpecs(variant.attributes),
      })),
      category: {
        id: row.category.id,
        slug: row.category.slug,
        name: row.category.name,
        nameTa: row.category.nameTa,
        description: row.category.description,
        descriptionTa: row.category.descriptionTa,
        icon: row.category.icon,
        imageUrl: row.category.imageUrl,
        parentId: row.category.parentId,
      },
      reviews: row.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        authorName: review.user.name,
        reply: review.reply,
        createdAt: review.createdAt.toISOString(),
      })),
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getProductsByIds(ids: string[]): Promise<ProductCardView[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.product.findMany({
      where: { id: { in: ids }, status: 'ACTIVE', deletedAt: null },
      select: cardSelect as never,
    });
    return (rows as unknown as CardRow[]).map(toCard);
  }

  private async listCards(
    where: Record<string, unknown>,
    orderBy: Record<string, 'asc' | 'desc'>[],
    limit: number,
  ): Promise<ProductCardView[]> {
    const rows = await this.db.product.findMany({
      where: where as never,
      orderBy: orderBy as never,
      take: limit,
      select: cardSelect as never,
    });
    return (rows as unknown as CardRow[]).map(toCard);
  }

  listFeatured(limit: number) {
    return this.listCards({ status: 'ACTIVE', isFeatured: true }, [{ soldCount: 'desc' }], limit);
  }

  listBestSellers(limit: number) {
    return this.listCards({ status: 'ACTIVE', deletedAt: null }, [{ soldCount: 'desc' }], limit);
  }

  listNewArrivals(limit: number) {
    return this.listCards({ status: 'ACTIVE', deletedAt: null }, [{ createdAt: 'desc' }], limit);
  }

  async listByCategorySlug(slug: string, limit: number): Promise<ProductCardView[]> {
    const ids = await this.categoryIdsForSlugs([slug]);
    if (!ids || ids.length === 0) return [];
    return this.listCards(
      { status: 'ACTIVE', deletedAt: null, categoryId: { in: ids } },
      [{ soldCount: 'desc' }],
      limit,
    );
  }

  async listBestOffers(limit: number): Promise<ProductCardView[]> {
    // Fetch a generous slice of in-stock products and rank by derived discount.
    const rows = await this.db.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null, stock: { gt: 0 } },
      orderBy: { mrp: 'desc' },
      take: Math.max(limit * 6, 60),
      select: cardSelect as never,
    });
    return (rows as unknown as CardRow[])
      .map(toCard)
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, limit);
  }

  async listRelated(productId: string, limit: number): Promise<ProductCardView[]> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, tags: true },
    });
    if (!product) return [];

    const sameCategory = await this.listCards(
      { status: 'ACTIVE', deletedAt: null, categoryId: product.categoryId, id: { not: productId } },
      [{ soldCount: 'desc' }],
      limit,
    );
    if (sameCategory.length >= limit || product.tags.length === 0) return sameCategory;

    const byTag = await this.listCards(
      {
        status: 'ACTIVE',
        deletedAt: null,
        id: { notIn: [productId, ...sameCategory.map((item) => item.id)] },
        tags: { hasSome: product.tags },
      },
      [{ soldCount: 'desc' }],
      limit - sameCategory.length,
    );
    return [...sameCategory, ...byTag];
  }

  async suggest(term: string, limit: number): Promise<ProductCardView[]> {
    const result = await this.searchProducts({ q: term, pageSize: limit, page: 1 });
    return result.items;
  }

  async listBrands(): Promise<string[]> {
    const groups = await this.db.product.groupBy({
      by: ['brand'],
      where: { status: 'ACTIVE', deletedAt: null },
      orderBy: { brand: 'asc' },
    });
    return groups.map((group) => group.brand);
  }

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    return row ? this.toUserRecord(row) : null;
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    const row = await this.db.user.findUnique({ where: { id: userId } });
    return row ? this.toUserRecord(row) : null;
  }

  private toUserRecord(row: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    passwordHash: string;
    isActive: boolean;
    createdAt: Date;
  }): UserRecord {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      passwordHash: row.passwordHash,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const row = await this.db.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        phone: input.phone ?? null,
        passwordHash: input.passwordHash,
      },
    });
    return this.toUserRecord(row);
  }

  async updateUserProfile(
    userId: string,
    data: { name: string; phone: string | null },
  ): Promise<UserRecord> {
    const row = await this.db.user.update({ where: { id: userId }, data });
    return this.toUserRecord(row);
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  // -------------------------------------------------------------------------
  // Addresses
  // -------------------------------------------------------------------------

  async listAddresses(userId: string): Promise<AddressView[]> {
    const rows = await this.db.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      phone: row.phone,
      line1: row.line1,
      line2: row.line2 ?? undefined,
      city: row.city,
      district: row.district,
      state: row.state,
      pincode: row.pincode,
      label: row.label as AddressView['label'],
      isDefault: row.isDefault,
    }));
  }

  async createAddress(
    userId: string,
    input: AddressInput & { label?: 'HOME' | 'WORK' | 'OTHER'; isDefault?: boolean },
  ): Promise<AddressView> {
    const existing = await this.db.address.count({ where: { userId } });
    const makeDefault = input.isDefault || existing === 0;

    const row = await this.db.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: {
          userId,
          fullName: input.fullName,
          phone: input.phone,
          line1: input.line1,
          line2: input.line2 || null,
          city: input.city,
          district: input.district,
          state: input.state,
          pincode: input.pincode,
          label: input.label ?? 'HOME',
          isDefault: makeDefault,
        },
      });
    });

    return {
      id: row.id,
      fullName: row.fullName,
      phone: row.phone,
      line1: row.line1,
      line2: row.line2 ?? undefined,
      city: row.city,
      district: row.district,
      state: row.state,
      pincode: row.pincode,
      label: row.label as AddressView['label'],
      isDefault: row.isDefault,
    };
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const result = await this.db.address.deleteMany({ where: { id: addressId, userId } });
    if (result.count === 0) throw notFound('Address not found.');
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    const owned = await this.db.address.count({ where: { id: addressId, userId } });
    if (owned === 0) throw notFound('Address not found.');
    await this.db.$transaction([
      this.db.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.db.address.update({ where: { id: addressId }, data: { isDefault: true } }),
    ]);
  }

  // -------------------------------------------------------------------------
  // Cart
  // -------------------------------------------------------------------------

  private cartWhere(owner: CartOwner) {
    return 'userId' in owner
      ? { userId: owner.userId }
      : { anonymousId: owner.anonymousId };
  }

  private async ensureCart(owner: CartOwner): Promise<string> {
    const where = this.cartWhere(owner);
    const existing = await this.db.cart.findFirst({ where, select: { id: true } });
    if (existing) return existing.id;
    const created = await this.db.cart.create({ data: where, select: { id: true } });
    return created.id;
  }

  async getCart(owner: CartOwner): Promise<ResolvedCart> {
    const cart = await this.db.cart.findFirst({
      where: this.cartWhere(owner),
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
            variant: true,
          },
        },
      },
    });
    if (!cart) return { items: [], notices: [] };

    const items: CartItemView[] = [];
    const notices: string[] = [];
    const removeIds: string[] = [];
    const clampUpdates: { id: string; quantity: number }[] = [];

    for (const line of cart.items) {
      const product = line.product;
      if (product.status !== 'ACTIVE' || product.deletedAt) {
        removeIds.push(line.id);
        continue;
      }
      const stock = line.variant ? line.variant.stock : product.stock;
      const unitPrice = line.variant?.price ?? product.price;

      let quantity = line.quantity;
      if (quantity > stock) {
        quantity = stock;
        clampUpdates.push({ id: line.id, quantity });
        notices.push(
          stock === 0
            ? `${product.name} is out of stock and was removed.`
            : `Quantity for ${product.name} was reduced to the ${stock} we have in stock.`,
        );
      }
      if (quantity <= 0) {
        removeIds.push(line.id);
        continue;
      }

      items.push({
        id: line.id,
        productId: product.id,
        variantId: line.variantId,
        slug: product.slug,
        name: product.name,
        nameTa: product.nameTa,
        variantName: line.variant?.name ?? null,
        sku: line.variant?.sku ?? product.sku,
        image: product.images[0]
          ? {
              url: product.images[0].url,
              alt: product.images[0].alt,
              width: product.images[0].width,
              height: product.images[0].height,
            }
          : null,
        unitPrice,
        mrp: product.mrp,
        quantity,
        availableStock: stock,
        lineTotal: unitPrice * quantity,
      });
    }

    // Persist the corrections so the next read is already consistent.
    if (removeIds.length > 0) {
      await this.db.cartItem.deleteMany({ where: { id: { in: removeIds } } });
    }
    for (const update of clampUpdates) {
      await this.db.cartItem.update({
        where: { id: update.id },
        data: { quantity: update.quantity },
      });
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, notices };
  }

  async addToCart(
    owner: CartOwner,
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<void> {
    const product = await this.db.product.findFirst({
      where: { id: productId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, stock: true, reservedStock: true },
    });
    if (!product) throw notFound('That product is no longer available.');

    let stock = product.stock - product.reservedStock;
    if (variantId) {
      const variant = await this.db.productVariant.findFirst({
        where: { id: variantId, productId, isActive: true },
        select: { stock: true },
      });
      if (!variant) throw notFound('That option is no longer available.');
      stock = variant.stock;
    }
    if (stock <= 0) {
      throw new AppError('That product is out of stock.', 409, 'out_of_stock');
    }

    const cartId = await this.ensureCart(owner);
    const existing = await this.db.cartItem.findFirst({
      where: { cartId, productId, variantId },
      select: { id: true, quantity: true },
    });

    const desired = (existing?.quantity ?? 0) + quantity;
    const capped = Math.min(desired, stock, MAX_QUANTITY_PER_ITEM);

    if (existing) {
      await this.db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: capped },
      });
    } else {
      await this.db.cartItem.create({
        data: { cartId, productId, variantId, quantity: capped },
      });
    }
    await this.db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  }

  async setCartItemQuantity(
    owner: CartOwner,
    itemId: string,
    quantity: number,
  ): Promise<void> {
    const line = await this.db.cartItem.findFirst({
      where: { id: itemId, cart: this.cartWhere(owner) },
      include: { product: { select: { stock: true } }, variant: { select: { stock: true } } },
    });
    if (!line) throw notFound('That cart item no longer exists.');

    if (quantity <= 0) {
      await this.db.cartItem.delete({ where: { id: itemId } });
      return;
    }
    const stock = line.variant?.stock ?? line.product.stock;
    if (quantity > stock) {
      throw new AppError(`Only ${stock} left in stock.`, 409, 'insufficient_stock');
    }
    await this.db.cartItem.update({
      where: { id: itemId },
      data: { quantity: Math.min(quantity, MAX_QUANTITY_PER_ITEM) },
    });
  }

  async clearCart(owner: CartOwner): Promise<void> {
    const cart = await this.db.cart.findFirst({
      where: this.cartWhere(owner),
      select: { id: true },
    });
    if (!cart) return;
    await this.db.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  async mergeCarts(anonymousId: string, userId: string): Promise<void> {
    const guest = await this.db.cart.findUnique({
      where: { anonymousId },
      include: { items: true },
    });
    if (!guest || guest.items.length === 0) {
      if (guest) await this.db.cart.delete({ where: { id: guest.id } });
      return;
    }

    const targetId = await this.ensureCart({ userId });
    for (const line of guest.items) {
      const existing = await this.db.cartItem.findFirst({
        where: { cartId: targetId, productId: line.productId, variantId: line.variantId },
        select: { id: true, quantity: true },
      });
      if (existing) {
        await this.db.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: Math.min(existing.quantity + line.quantity, MAX_QUANTITY_PER_ITEM),
          },
        });
      } else {
        await this.db.cartItem.create({
          data: {
            cartId: targetId,
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
          },
        });
      }
    }
    await this.db.cart.delete({ where: { id: guest.id } });
  }

  // -------------------------------------------------------------------------
  // Wishlist
  // -------------------------------------------------------------------------

  private async ensureWishlist(userId: string): Promise<string> {
    const existing = await this.db.wishlist.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.db.wishlist.create({
      data: { userId },
      select: { id: true },
    });
    return created.id;
  }

  async listWishlist(userId: string): Promise<ProductCardView[]> {
    const wishlist = await this.db.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
          include: { product: { select: cardSelect as never } },
        },
      },
    });
    if (!wishlist) return [];
    return wishlist.items
      .map((item) => item.product as unknown as CardRow)
      .filter(Boolean)
      .map(toCard);
  }

  async listWishlistIds(userId: string): Promise<string[]> {
    const wishlist = await this.db.wishlist.findUnique({
      where: { userId },
      select: { items: { select: { productId: true } } },
    });
    return wishlist?.items.map((item) => item.productId) ?? [];
  }

  async toggleWishlist(
    userId: string,
    productId: string,
  ): Promise<{ inWishlist: boolean }> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw notFound('That product is no longer available.');

    const wishlistId = await this.ensureWishlist(userId);
    const existing = await this.db.wishlistItem.findFirst({
      where: { wishlistId, productId },
      select: { id: true },
    });
    if (existing) {
      await this.db.wishlistItem.delete({ where: { id: existing.id } });
      return { inWishlist: false };
    }
    await this.db.wishlistItem.create({ data: { wishlistId, productId } });
    return { inWishlist: true };
  }

  // -------------------------------------------------------------------------
  // Coupons
  // -------------------------------------------------------------------------

  async findCoupon(code: string): Promise<CouponRule | null> {
    const row = await this.db.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      type: row.type as CouponRule['type'],
      value: row.value,
      minOrder: row.minOrder,
      maxDiscount: row.maxDiscount,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      usageLimit: row.usageLimit,
      usedCount: row.usedCount,
      isActive: row.isActive,
    };
  }

  // -------------------------------------------------------------------------
  // Orders
  // -------------------------------------------------------------------------

  async placeOrder(input: PlaceOrderInput): Promise<OrderView> {
    const order = await this.db.$transaction(async (tx) => {
      // Re-read stock inside the transaction; the cart snapshot may be stale.
      for (const item of input.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, status: true, deletedAt: true, name: true },
        });
        if (!product || product.status !== 'ACTIVE' || product.deletedAt) {
          throw new AppError(
            `${item.name} is no longer available.`,
            409,
            'item_unavailable',
          );
        }
        if (product.stock < item.quantity) {
          throw new AppError(
            `Only ${product.stock} of ${product.name} left in stock.`,
            409,
            'insufficient_stock',
          );
        }
      }

      const created = await tx.order.create({
        data: {
          orderNumber: input.orderNumber,
          userId: input.userId,
          status: 'PENDING',
          paymentStatus: input.paymentStatus,
          paymentMethod: input.paymentMethod,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 || null,
          city: input.city,
          district: input.district,
          state: input.state,
          pincode: input.pincode,
          subtotal: input.subtotal,
          discountTotal: input.discountTotal,
          shippingFee: input.shippingFee,
          total: input.total,
          couponCode: input.coupon?.code ?? null,
          couponId: input.coupon?.id ?? null,
          notes: input.notes || null,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              name: item.name,
              nameTa: item.nameTa,
              sku: item.sku,
              imageUrl: item.image?.url ?? null,
              unitPrice: item.unitPrice,
              mrp: item.mrp,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            })),
          },
          payments: {
            create: {
              provider: input.paymentProvider,
              amount: input.total,
              status: input.paymentStatus,
            },
          },
        },
        include: { items: { include: { product: { select: { slug: true } } } } },
      });

      // Stock never moves without a ledger row beside it, in the same
      // transaction. The admin panel reconciles the sum of these movements
      // against the stored count, and a sale that skipped the ledger would
      // show up there as unexplained shrinkage.
      for (const item of input.items) {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
          select: { stock: true },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            variantId: item.variantId ?? null,
            change: -item.quantity,
            quantityBefore: updated.stock + item.quantity,
            quantityAfter: updated.stock,
            reason: 'SALE',
            orderId: created.id,
          },
        });
      }

      if (input.coupon) {
        await tx.coupon.update({
          where: { id: input.coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

    return this.toOrderView(order);
  }

  private toOrderView(row: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    placedAt: Date;
    deliveredAt: Date | null;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    district: string;
    state: string;
    pincode: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    shippingFee: number;
    total: number;
    couponCode: string | null;
    trackingNumber: string | null;
    cancelReason: string | null;
    notes: string | null;
    items: {
      id: string;
      productId: string | null;
      name: string;
      nameTa: string | null;
      sku: string;
      imageUrl: string | null;
      unitPrice: number;
      mrp: number;
      quantity: number;
      lineTotal: number;
      product?: { slug: string } | null;
    }[];
  }): OrderView {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status as OrderStatus,
      paymentStatus: row.paymentStatus as PaymentStatus,
      paymentMethod: row.paymentMethod as OrderView['paymentMethod'],
      placedAt: row.placedAt.toISOString(),
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      district: row.district,
      state: row.state,
      pincode: row.pincode,
      subtotal: row.subtotal,
      discountTotal: row.discountTotal,
      taxTotal: row.taxTotal,
      shippingFee: row.shippingFee,
      total: row.total,
      couponCode: row.couponCode,
      trackingNumber: row.trackingNumber,
      cancelReason: row.cancelReason,
      notes: row.notes,
      items: row.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        slug: item.product?.slug ?? null,
        name: item.name,
        nameTa: item.nameTa,
        sku: item.sku,
        imageUrl: item.imageUrl,
        unitPrice: item.unitPrice,
        mrp: item.mrp,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
    };
  }

  private readonly orderInclude = {
    items: { include: { product: { select: { slug: true } } } },
  } as const;

  async listOrdersForUser(userId: string): Promise<OrderView[]> {
    const rows = await this.db.order.findMany({
      where: { userId },
      orderBy: { placedAt: 'desc' },
      include: this.orderInclude,
    });
    return rows.map((row) => this.toOrderView(row));
  }

  async getOrderForUser(userId: string, orderNumber: string): Promise<OrderView | null> {
    const row = await this.db.order.findFirst({
      where: { orderNumber, userId },
      include: this.orderInclude,
    });
    return row ? this.toOrderView(row) : null;
  }

  async getOrderByNumberAndEmail(
    orderNumber: string,
    email: string,
  ): Promise<OrderView | null> {
    const row = await this.db.order.findFirst({
      where: { orderNumber, customerEmail: email.toLowerCase() },
      include: this.orderInclude,
    });
    return row ? this.toOrderView(row) : null;
  }

  async cancelOrder(
    userId: string,
    orderNumber: string,
    reason: string,
  ): Promise<OrderView> {
    return this.db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { orderNumber, userId },
        include: this.orderInclude,
      });
      if (!order) throw notFound('Order not found.');
      if (!(CANCELLABLE_STATUSES as readonly string[]).includes(order.status)) {
        throw new AppError(
          'This order can no longer be cancelled. Please contact support.',
          409,
          'not_cancellable',
        );
      }

      // Returning the units is also a stock movement, and gets its own ledger
      // row so the count and the ledger stay reconcilable.
      for (const item of order.items) {
        if (!item.productId) continue;
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            soldCount: { decrement: item.quantity },
          },
          select: { stock: true },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            variantId: item.variantId ?? null,
            change: item.quantity,
            quantityBefore: updated.stock - item.quantity,
            quantityAfter: updated.stock,
            reason: 'CANCELLED_ORDER',
            orderId: order.id,
            note: 'Cancelled by the customer',
          },
        });
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
          paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : order.paymentStatus,
        },
        include: this.orderInclude,
      });
      return this.toOrderView(updated);
    });
  }

  /**
   * Raises a return request against a delivered order.
   *
   * Everything that decides whether a return is allowed is read here, not sent
   * by the browser: the order must belong to this customer, must have been
   * delivered, must be inside the shop's return window, and each line may only
   * send back what was actually bought and not already returned.
   *
   * No stock moves and no money moves. This creates a request for shop staff to
   * judge — goods only return to the shelf once someone has seen them.
   */
  async requestReturn(
    userId: string,
    orderNumber: string,
    input: ReturnRequestInput,
  ): Promise<{ returnNumber: string; orderNumber: string; lines: number }> {
    return this.db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { orderNumber, userId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          deliveredAt: true,
          items: { select: { id: true, productId: true, quantity: true, name: true } },
        },
      });
      if (!order) throw notFound('Order not found.');

      if (order.status !== 'DELIVERED' || !order.deliveredAt) {
        throw new AppError(
          'Only delivered orders can be returned.',
          409,
          'not_returnable',
        );
      }

      const settings = await tx.storeSettings.findUnique({
        where: { id: 'default' },
        select: { returnWindowDays: true },
      });
      const windowDays = settings?.returnWindowDays ?? 7;
      const deadline = new Date(order.deliveredAt);
      deadline.setDate(deadline.getDate() + windowDays);
      if (Date.now() > deadline.getTime()) {
        throw new AppError(
          `The ${windowDays}-day return window for this order has closed.`,
          409,
          'return_window_closed',
        );
      }

      // Quantities already sent back on earlier requests still count against
      // the order, so the same unit cannot be returned twice.
      const existing = await tx.returnItem.groupBy({
        by: ['orderItemId'],
        where: {
          returnRequest: { orderId: order.id, status: { not: 'REJECTED' } },
        },
        _sum: { quantity: true },
      });
      const alreadyReturned = new Map(
        existing.map((row) => [row.orderItemId, row._sum.quantity ?? 0]),
      );

      const lines = input.items
        .map((line) => {
          const item = order.items.find((candidate) => candidate.id === line.orderItemId);
          if (!item) {
            throw new AppError('That item is not on this order.', 422, 'unknown_item');
          }
          const remaining = item.quantity - (alreadyReturned.get(item.id) ?? 0);
          if (line.quantity < 1 || line.quantity > remaining) {
            throw new AppError(
              `You can return at most ${remaining} of ${item.name}.`,
              422,
              'quantity_too_high',
            );
          }
          return {
            orderItemId: item.id,
            productId: item.productId,
            quantity: line.quantity,
          };
        })
        .filter((line) => line.quantity > 0);

      if (lines.length === 0) {
        throw new AppError('Choose at least one item to return.', 422, 'no_items');
      }

      const returnNumber = `RT-${order.orderNumber.replace(/^TE-/, '')}-${Math.random()
        .toString(36)
        .slice(2, 5)
        .toUpperCase()}`;

      const created = await tx.returnRequest.create({
        data: {
          returnNumber,
          orderId: order.id,
          reason: input.reason.trim(),
          customerComment: input.comment?.trim() || null,
          status: 'REQUESTED',
          items: { create: lines },
        },
        select: { returnNumber: true },
      });

      return { ...created, orderNumber: order.orderNumber, lines: lines.length };
    });
  }

  /**
   * Whether this order can still be returned.
   *
   * Returns `null` when it cannot — not delivered, outside the window, or
   * everything already sent back — so the page simply shows nothing rather
   * than offering a form the API would refuse.
   */
  async returnEligibility(
    userId: string,
    orderNumber: string,
  ): Promise<ReturnEligibility | null> {
    const order = await this.db.order.findFirst({
      where: { orderNumber, userId },
      select: {
        id: true,
        status: true,
        deliveredAt: true,
        items: {
          select: {
            id: true,
            name: true,
            nameTa: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });
    if (!order || order.status !== 'DELIVERED' || !order.deliveredAt) return null;

    const settings = await this.db.storeSettings.findUnique({
      where: { id: 'default' },
      select: { returnWindowDays: true },
    });
    const windowDays = settings?.returnWindowDays ?? 7;

    const deadline = new Date(order.deliveredAt);
    deadline.setDate(deadline.getDate() + windowDays);
    if (Date.now() > deadline.getTime()) return null;

    const requests = await this.db.returnRequest.findMany({
      where: { orderId: order.id, status: { not: 'REJECTED' } },
      select: {
        status: true,
        items: { select: { orderItemId: true, quantity: true } },
      },
    });

    const returned = new Map<string, number>();
    for (const request of requests) {
      for (const item of request.items) {
        returned.set(item.orderItemId, (returned.get(item.orderItemId) ?? 0) + item.quantity);
      }
    }

    const returnable = order.items
      .map((item) => ({
        id: item.id,
        name: item.name,
        nameTa: item.nameTa,
        unitPrice: item.unitPrice,
        quantity: item.quantity - (returned.get(item.id) ?? 0),
      }))
      .filter((item) => item.quantity > 0);

    const pending = requests.some((request) =>
      ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'RECEIVED', 'REFUND_PENDING'].includes(
        request.status,
      ),
    );

    if (returnable.length === 0 && !pending) return null;
    return { windowDays, pending, returnable };
  }

  // -------------------------------------------------------------------------
  // Reviews
  // -------------------------------------------------------------------------

  async hasPurchased(userId: string, productId: string): Promise<boolean> {
    const count = await this.db.order.count({
      where: {
        userId,
        status: { not: 'CANCELLED' },
        items: { some: { productId } },
      },
    });
    return count > 0;
  }

  async upsertReview(
    userId: string,
    _authorName: string,
    input: { productId: string; rating: number; title?: string; comment: string },
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.review.upsert({
        where: { productId_userId: { productId: input.productId, userId } },
        create: {
          productId: input.productId,
          userId,
          rating: input.rating,
          title: input.title || null,
          comment: input.comment,
        },
        update: {
          rating: input.rating,
          title: input.title || null,
          comment: input.comment,
        },
      });

      const stats = await tx.review.aggregate({
        where: { productId: input.productId, status: 'APPROVED' },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await tx.product.update({
        where: { id: input.productId },
        data: {
          ratingAvg: Math.round((stats._avg.rating ?? 0) * 10) / 10,
          ratingCount: stats._count._all,
        },
      });
    });
  }

}
