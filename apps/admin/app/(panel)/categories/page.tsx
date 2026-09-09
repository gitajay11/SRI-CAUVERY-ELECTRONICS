import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listCategoryTree } from '@/services/categories';
import { PageHeader, Panel, EmptyState } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { CategoryTree } from '@/components/categories/CategoryTree';
import { GridIcon, PlusIcon } from '@/components/ui/Icons';

export const metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const identity = await requirePermission('categories.view');
  const { t } = await getI18n();

  const tree = await listCategoryTree();
  const canManage = identity.permissions.has('categories.manage');
  const total = tree.reduce((count, node) => count + 1 + node.children.length, 0);

  return (
    <>
      <PageHeader
        title={t('categories.title')}
        description={t('categories.count', { count: total })}
        action={
          canManage ? (
            <ButtonLink href="/categories/new">
              <PlusIcon className="text-[1.1em]" />
              {t('categories.new')}
            </ButtonLink>
          ) : null
        }
      />

      <Panel padded={false}>
        {tree.length === 0 ? (
          <EmptyState
            icon={<GridIcon />}
            title={t('categories.none')}
            action={
              canManage ? (
                <ButtonLink href="/categories/new">{t('categories.new')}</ButtonLink>
              ) : null
            }
          />
        ) : (
          <CategoryTree tree={tree} canManage={canManage} />
        )}
      </Panel>
    </>
  );
}
