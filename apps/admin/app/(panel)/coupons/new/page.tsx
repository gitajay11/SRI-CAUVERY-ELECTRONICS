import Link from 'next/link';
import { db } from '@tamizh/db';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { PageHeader } from '@/components/ui/Primitives';
import { CouponForm } from '@/components/coupons/CouponForm';
import { emptyCoupon } from '@/lib/coupon-form';

export const metadata = { title: 'New coupon' };

export default async function NewCouponPage() {
  await requirePermission('coupons.manage');
  const { t } = await getI18n();

  const categories = await db.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, parentId: true },
  });

  return (
    <>
      <PageHeader
        title={t('coupons.new')}
        breadcrumb={
          <Link href="/coupons" className="text-sm text-slate-500 hover:text-link">
            ← {t('coupons.title')}
          </Link>
        }
      />
      <CouponForm initial={emptyCoupon()} categories={categories} locked={false} />
    </>
  );
}
