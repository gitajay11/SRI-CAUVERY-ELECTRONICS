import Link from 'next/link';
import { db } from '@tamizh/db';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requireAdmin } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { PageHeader, Panel, Badge, EmptyState } from '@/components/ui/Primitives';
import { Thumb } from '@/components/ui/Thumb';
import { SearchIcon } from '@/components/ui/Icons';
import { first, type SearchParams } from '@/lib/query';

export const metadata = { title: 'Search' };

/**
 * Search across the shop.
 *
 * Each section is queried only if the person is allowed to see it — a support
 * account searching a phone number gets orders, not staff accounts. Nothing
 * here is a shortcut past a permission check.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const identity = await requireAdmin();
  const { t } = await getI18n();
  const params = await searchParams;
  const query = (first(params.q) ?? '').trim();

  const can = (permission: Parameters<typeof identity.permissions.has>[0]) =>
    identity.permissions.has(permission);

  const empty = query.length < 2;
  const like = { contains: query, mode: 'insensitive' as const };

  const [orders, products, customers, coupons] = empty
    ? [[], [], [], []]
    : await Promise.all([
        can('orders.view')
          ? db.order.findMany({
              where: {
                OR: [
                  { orderNumber: { contains: query.toUpperCase() } },
                  { customerName: like },
                  { customerPhone: { contains: query } },
                  { customerEmail: like },
                ],
              },
              orderBy: { placedAt: 'desc' },
              take: 8,
              select: {
                orderNumber: true,
                customerName: true,
                status: true,
                total: true,
                placedAt: true,
              },
            })
          : Promise.resolve([]),
        can('products.view')
          ? db.product.findMany({
              where: {
                deletedAt: null,
                OR: [{ name: like }, { nameTa: like }, { sku: like }, { brand: like }],
              },
              take: 8,
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stock: true,
                images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
              },
            })
          : Promise.resolve([]),
        can('customers.view')
          ? db.user.findMany({
              where: {
                OR: [{ name: like }, { email: like }, { phone: { contains: query } }],
              },
              take: 8,
              select: { id: true, name: true, email: true, phone: true },
            })
          : Promise.resolve([]),
        can('coupons.view')
          ? db.coupon.findMany({
              where: {
                OR: [
                  { code: { contains: query.toUpperCase() } },
                  { description: like },
                ],
              },
              take: 5,
              select: { id: true, code: true, description: true, isActive: true },
            })
          : Promise.resolve([]),
      ]);

  const found =
    orders.length + products.length + customers.length + coupons.length;

  return (
    <>
      <PageHeader
        title={t('search.title')}
        description={
          empty
            ? t('search.hint')
            : t('search.results', { count: found, query })
        }
      />

      {empty ? (
        <Panel>
          <EmptyState icon={<SearchIcon />} title={t('search.hint')} />
        </Panel>
      ) : found === 0 ? (
        <Panel>
          <EmptyState icon={<SearchIcon />} title={t('search.nothing', { query })} />
        </Panel>
      ) : (
        <div className="space-y-5">
          {orders.length > 0 ? (
            <Panel title={t('orders.title')} padded={false}>
              <ul className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <li key={order.orderNumber}>
                    <Link
                      href={`/orders/${order.orderNumber}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50"
                    >
                      <span className="font-mono text-sm font-medium text-slate-900">
                        {order.orderNumber}
                      </span>
                      <span className="text-sm text-slate-600">{order.customerName}</span>
                      <span className="ms-auto flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {formatDate(order.placedAt)}
                        </span>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatINR(order.total)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {products.length > 0 ? (
            <Panel title={t('products.title')} padded={false}>
              <ul className="divide-y divide-slate-100">
                {products.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/products/${product.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <Thumb url={product.images[0]?.url} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {product.name}
                        </span>
                        <span className="block font-mono text-xs text-slate-500">
                          {product.sku}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Badge tone={product.stock > 0 ? 'neutral' : 'critical'}>
                          {product.stock}
                        </Badge>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatINR(product.price)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {customers.length > 0 ? (
            <Panel title={t('customers.title')} padded={false}>
              <ul className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <li key={customer.id}>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-0.5 px-4 py-3 hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-slate-900">
                        {customer.name}
                      </span>
                      <span className="text-xs text-slate-500">{customer.email}</span>
                      {customer.phone ? (
                        <span className="text-xs tabular-nums text-slate-500">
                          {customer.phone}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {coupons.length > 0 ? (
            <Panel title={t('coupons.title')} padded={false}>
              <ul className="divide-y divide-slate-100">
                {coupons.map((coupon) => (
                  <li key={coupon.id}>
                    <Link
                      href={`/coupons/${coupon.id}`}
                      className="flex flex-wrap items-center gap-x-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {coupon.code}
                      </span>
                      <span className="text-sm text-slate-600">{coupon.description}</span>
                      {!coupon.isActive ? (
                        <Badge tone="neutral">{t('coupons.inactive')}</Badge>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      )}
    </>
  );
}
