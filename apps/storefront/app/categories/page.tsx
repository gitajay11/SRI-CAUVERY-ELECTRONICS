import type { Metadata } from 'next';
import { getI18n } from '@/i18n/server';
import { getRepository } from '@/services/repository';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';

export const metadata: Metadata = buildMetadata({
  title: 'Categories',
  description:
    'Every category at Sri Cauvery Electronics — mobile accessories, chargers, cables, earphones, speakers, power banks, LED lighting, and return gifts for weddings, birthdays and festivals.',
  path: '/categories',
});

export default async function CategoriesPage() {
  const { t, locale } = await getI18n();
  const categories = await getRepository().listCategoryTree();

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('nav.categories'), path: '/categories' },
        ]}
      />

      <header className="mb-7">
        <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {t('home.categories.title')}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500 sm:text-base">
          {t('home.categories.subtitle')}
        </p>
      </header>

      <CategoryShowcase
        categories={categories}
        locale={locale}
        viewAllLabel={t('common.viewAll')}
      />
    </div>
  );
}
