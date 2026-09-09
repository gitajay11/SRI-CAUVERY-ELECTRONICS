import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@tamizh/db';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getCategory } from '@/services/categories';
import { PageHeader } from '@/components/ui/Primitives';
import { CategoryForm } from '@/components/categories/CategoryForm';
import type { CategoryFormValues } from '@/lib/category-form';

export const metadata = { title: 'Edit category' };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('categories.manage');
  const { t } = await getI18n();
  const { id } = await params;

  const [category, parents] = await Promise.all([
    getCategory(id),
    db.category.findMany({
      where: { deletedAt: null, parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
  ]);

  if (!category) notFound();

  const initial: CategoryFormValues = {
    id: category.id,
    slug: category.slug,
    name: category.name,
    nameTa: category.nameTa,
    description: category.description ?? '',
    descriptionTa: category.descriptionTa ?? '',
    icon: category.icon ?? '',
    imageUrl: category.imageUrl ?? '',
    parentId: category.parentId ?? '',
    sortOrder: String(category.sortOrder),
    isActive: category.isActive,
  };

  return (
    <>
      <PageHeader
        title={category.name}
        description={t('categories.edit')}
        breadcrumb={
          <Link href="/categories" className="text-sm text-slate-500 hover:text-link">
            ← {t('categories.title')}
          </Link>
        }
      />
      <CategoryForm initial={initial} parents={parents} />
    </>
  );
}
