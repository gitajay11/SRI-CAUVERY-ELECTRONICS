import Link from 'next/link';
import { db } from '@tamizh/db';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { PageHeader } from '@/components/ui/Primitives';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { emptyCategory } from '@/lib/category-form';

export const metadata = { title: 'New category' };

export default async function NewCategoryPage() {
  await requirePermission('categories.manage');
  const { t } = await getI18n();

  const parents = await db.category.findMany({
    where: { deletedAt: null, parentId: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  });

  return (
    <>
      <PageHeader
        title={t('categories.new')}
        breadcrumb={
          <Link href="/categories" className="text-sm text-slate-500 hover:text-link">
            ← {t('categories.title')}
          </Link>
        }
      />
      <CategoryForm initial={emptyCategory()} parents={parents} />
    </>
  );
}
