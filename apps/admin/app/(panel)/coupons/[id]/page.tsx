import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@tamizh/db';
import { formatINR, paiseToRupees } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getCoupon } from '@/services/coupons';
import { PageHeader, Panel, StatCard, EmptyState } from '@/components/ui/Primitives';
import { CouponForm } from '@/components/coupons/CouponForm';
import type { CouponFormValues } from '@/lib/coupon-form';
import { TicketIcon } from '@/components/ui/Icons';

export const metadata = { title: 'Edit coupon' };

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('coupons.manage');
  const { t } = await getI18n();
  const { id } = await params;

  const [coupon, categories] = await Promise.all([
    getCoupon(id),
    db.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  if (!coupon) notFound();

  const initial: CouponFormValues = {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    value:
      coupon.type === 'PERCENT'
        ? String(coupon.value / 100)
        : String(paiseToRupees(coupon.value)),
    minOrder: String(paiseToRupees(coupon.minOrder)),
    maxDiscount:
      coupon.maxDiscount === null ? '' : String(paiseToRupees(coupon.maxDiscount)),
    startsAt: coupon.startsAt.toISOString().slice(0, 10),
    endsAt: coupon.endsAt ? coupon.endsAt.toISOString().slice(0, 10) : '',
    usageLimit: coupon.usageLimit === null ? '' : String(coupon.usageLimit),
    perUserLimit: coupon.perUserLimit === null ? '' : String(coupon.perUserLimit),
    isActive: coupon.isActive,
    categoryIds: coupon.categories.map((scope) => scope.categoryId),
  };

  return (
    <>
      <PageHeader
        title={coupon.code}
        description={coupon.description}
        breadcrumb={
          <Link href="/coupons" className="text-sm text-slate-500 hover:text-brand-700">
            ← {t('coupons.title')}
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label={t('coupons.used')} value={coupon.usedCount} />
        <StatCard
          label={t('coupons.discountGiven')}
          value={formatINR(coupon.stats.discountGiven)}
          tone="caution"
        />
        <StatCard
          label={t('coupons.revenue')}
          value={formatINR(coupon.stats.revenue)}
          tone="positive"
        />
      </div>

      <div className="space-y-5">
        <CouponForm
          initial={initial}
          categories={categories}
          locked={coupon.usedCount > 0}
        />

        <Panel title={t('coupons.redemptions')} padded={false} className="max-w-3xl">
          {coupon.redemptions.length === 0 ? (
            <EmptyState icon={<TicketIcon />} title={t('coupons.noRedemptions')} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {coupon.redemptions.map((redemption) => (
                <li
                  key={redemption.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="tabular-nums text-slate-500">
                    {formatDate(redemption.usedAt, true)}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    −{formatINR(redemption.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
