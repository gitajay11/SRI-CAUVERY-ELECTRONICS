import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@tamizh/db';
import { paiseToRupees } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { storefrontUrl } from '@/lib/env';
import { getI18n } from '@/i18n/server';
import { getProduct } from '@/services/products';
import { PageHeader, Badge } from '@/components/ui/Primitives';
import { ProductForm } from '@/components/products/ProductForm';
import type { ProductFormValues } from '@/lib/product-form';

export const metadata = { title: 'Edit product' };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const identity = await requirePermission('products.update');
  const { t, dict } = await getI18n();
  const { id } = await params;

  const [product, categories] = await Promise.all([
    getProduct(id),
    db.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  if (!product) notFound();

  const specs =
    product.specs && typeof product.specs === 'object' && !Array.isArray(product.specs)
      ? Object.entries(product.specs as Record<string, unknown>).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [];

  const initial: ProductFormValues = {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    nameTa: product.nameTa ?? '',
    description: product.description,
    descriptionTa: product.descriptionTa ?? '',
    brand: product.brand,
    categoryId: product.categoryId,
    mrp: String(paiseToRupees(product.mrp)),
    price: String(paiseToRupees(product.price)),
    costPrice: String(paiseToRupees(product.costPrice)),
    taxPercent: String(product.taxBps / 100),
    stock: String(product.stock),
    lowStockThreshold: String(product.lowStockThreshold),
    weightGrams: product.weightGrams === null ? '' : String(product.weightGrams),
    lengthMm: product.lengthMm === null ? '' : String(product.lengthMm),
    widthMm: product.widthMm === null ? '' : String(product.widthMm),
    heightMm: product.heightMm === null ? '' : String(product.heightMm),
    status: product.status,
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    tags: product.tags.join(', '),
    specs: specs.length > 0 ? specs : [{ key: '', value: '' }],
    images: product.images.map((image) => ({ url: image.url, alt: image.alt ?? '' })),
  };

  return (
    <>
      <PageHeader
        title={product.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono">{product.sku}</span>
            <span aria-hidden="true">·</span>
            <span>{t('products.sold', { count: product.soldCount })}</span>
            <span aria-hidden="true">·</span>
            <span>
              {t('common.updated')} {formatDate(product.updatedAt, true)}
            </span>
          </span>
        }
        breadcrumb={
          <Link href="/products" className="text-sm text-slate-500 hover:text-brand-700">
            ← {t('products.title')}
          </Link>
        }
        action={
          <Badge
            tone={
              product.status === 'ACTIVE'
                ? 'positive'
                : product.status === 'DRAFT'
                  ? 'caution'
                  : 'neutral'
            }
          >
            {dict[`productStatus.${product.status}` as 'productStatus.ACTIVE']}
          </Badge>
        }
      />

      <ProductForm
        initial={initial}
        categories={categories}
        storefrontUrl={storefrontUrl()}
        canEditPrice={identity.permissions.has('products.price')}
      />
    </>
  );
}
