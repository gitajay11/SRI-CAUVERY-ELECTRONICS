import Link from 'next/link';
import { db } from '@tamizh/db';
import { requirePermission } from '@/lib/session';
import { storefrontUrl } from '@/lib/env';
import { getI18n } from '@/i18n/server';
import { PageHeader, Alert } from '@/components/ui/Primitives';
import { ProductForm } from '@/components/products/ProductForm';
import { emptyProduct } from '@/lib/product-form';

export const metadata = { title: 'New product' };

export default async function NewProductPage() {
  const identity = await requirePermission('products.create');
  const { t } = await getI18n();

  const categories = await db.category.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, parentId: true },
  });

  const assignable = categories.filter((category) => category.parentId !== null);

  return (
    <>
      <PageHeader
        title={t('products.new')}
        description={t('products.newHint')}
        breadcrumb={
          <Link href="/products" className="text-sm text-slate-500 hover:text-brand-700">
            ← {t('products.title')}
          </Link>
        }
      />

      {assignable.length === 0 ? (
        <Alert tone="caution" title={t('products.noCategories')}>
          <Link href="/categories" className="font-medium underline">
            {t('categories.new')}
          </Link>
        </Alert>
      ) : (
        <ProductForm
          initial={emptyProduct(assignable[0]!.id)}
          categories={categories}
          storefrontUrl={storefrontUrl()}
          canEditPrice={identity.permissions.has('products.price')}
        />
      )}
    </>
  );
}
