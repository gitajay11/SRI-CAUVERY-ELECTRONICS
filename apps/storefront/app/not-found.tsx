import Link from 'next/link';
import { getI18n } from '@/i18n/server';
import { getRepository } from '@/services/repository';
import { ButtonLink } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/Primitives';
import { ProductRail } from '@/components/product/ProductGrid';
import { SearchIcon } from '@/components/ui/Icons';

/** 404 — offers a way forward rather than a dead end. */
export default async function NotFound() {
  const { t } = await getI18n();
  const suggestions = await getRepository().listBestSellers(8);

  return (
    <div className="container-page py-12 lg:py-20">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-7xl font-extrabold text-brand-200 sm:text-8xl">404</p>
        <h1 className="mt-3 text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {t('error.notFound.title')}
        </h1>
        <p className="mt-2.5 text-ink-600">{t('error.notFound.body')}</p>

        <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
          <ButtonLink href="/" size="lg">
            {t('error.notFound.cta')}
          </ButtonLink>
          <ButtonLink href="/shop" variant="outline" size="lg">
            <SearchIcon className="text-[1.15em]" />
            {t('nav.shop')}
          </ButtonLink>
        </div>

        <p className="mt-5 text-sm text-ink-500">
          {t('order.needHelp')}{' '}
          <Link href="/contact" className="font-semibold text-link hover:underline">
            {t('footer.contactUs')}
          </Link>
        </p>
      </div>

      {suggestions.length > 0 ? (
        <section className="mt-14">
          <SectionHeading title={t('home.bestSellers.title')} />
          <ProductRail products={suggestions} />
        </section>
      ) : null}
    </div>
  );
}
