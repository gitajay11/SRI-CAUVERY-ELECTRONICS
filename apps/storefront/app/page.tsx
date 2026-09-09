import type { Metadata } from 'next';
import { getI18n } from '@/i18n/server';
import { getRepository } from '@/services/repository';
import { buildMetadata, SITE_TITLE } from '@/lib/seo';
import { SectionHeading } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { ProductGrid, ProductRail } from '@/components/product/ProductGrid';
import { Hero } from '@/components/home/Hero';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import {
  BulkEnquiryBanner,
  OfferStrip,
  Testimonials,
  WhyChooseUs,
} from '@/components/home/HomeSections';

export const metadata: Metadata = buildMetadata({ title: SITE_TITLE, path: '/' });

/**
 * Rendered per request: the shared layout reads the session and locale
 * cookies, so every route in the app is dynamic. Speed comes from streaming
 * the shell, server-rendering the catalogue in one round trip, and letting the
 * service worker serve repeat visits.
 */

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const repo = getRepository();

  const [categories, featured, bestSellers, newArrivals, returnGifts, offers] =
    await Promise.all([
      repo.listCategoryTree(),
      repo.listFeatured(8),
      repo.listBestSellers(8),
      repo.listNewArrivals(8),
      repo.listByCategorySlug('return-gifts', 8),
      repo.listBestOffers(8),
    ]);

  const showcase = featured
    .filter((product) => product.image)
    .slice(0, 4)
    .map((product) => ({
      url: product.image!.url,
      alt: product.image!.alt || product.name,
      slug: product.slug,
    }));

  return (
    <>
      <Hero showcase={showcase} />

      {/* Categories */}
      <section className="container-page py-10 lg:py-14">
        <SectionHeading
          title={t('home.categories.title')}
          subtitle={t('home.categories.subtitle')}
          as="h2"
          action={
            <ButtonLink href="/categories" variant="ghost" size="sm">
              {t('common.viewAll')} →
            </ButtonLink>
          }
        />
        <CategoryShowcase
          categories={categories}
          locale={locale}
          viewAllLabel={t('common.viewAll')}
        />
      </section>

      {/* Featured */}
      {featured.length > 0 ? (
        <section className="container-page pb-10 lg:pb-14">
          <SectionHeading
            title={t('home.featured.title')}
            subtitle={t('home.featured.subtitle')}
            action={
              <ButtonLink href="/shop?featured=1" variant="ghost" size="sm">
                {t('common.viewAll')} →
              </ButtonLink>
            }
          />
          <ProductGrid products={featured.slice(0, 8)} priorityCount={2} />
        </section>
      ) : null}

      {/* Offers */}
      <section className="container-page pb-10 lg:pb-14">
        <OfferStrip
          locale={locale}
          title={t('home.offers.title')}
          body={t('home.offers.subtitle')}
          href="/shop?minDiscount=40&sort=price-asc"
          cta={t('home.hero.cta')}
        />
        <div className="mt-5">
          <ProductRail
            products={offers}
            seeAllHref="/shop?minDiscount=40"
            seeAllLabel={t('common.viewAll')}
          />
        </div>
      </section>

      {/* Best sellers */}
      {bestSellers.length > 0 ? (
        <section className="container-page pb-10 lg:pb-14">
          <SectionHeading
            title={t('home.bestSellers.title')}
            subtitle={t('home.bestSellers.subtitle')}
            action={
              <ButtonLink href="/shop?sort=best-selling" variant="ghost" size="sm">
                {t('common.viewAll')} →
              </ButtonLink>
            }
          />
          <ProductRail
            products={bestSellers}
            seeAllHref="/shop?sort=best-selling"
            seeAllLabel={t('common.viewAll')}
          />
        </section>
      ) : null}

      {/* Return gifts */}
      {returnGifts.length > 0 ? (
        <section className="bg-success-50/60 py-10 lg:py-14">
          <div className="container-page">
            <SectionHeading
              title={t('home.returnGifts.title')}
              subtitle={t('home.returnGifts.subtitle')}
              action={
                <ButtonLink href="/categories/return-gifts" variant="secondary" size="sm">
                  {t('home.returnGifts.cta')} →
                </ButtonLink>
              }
            />
            <ProductGrid products={returnGifts.slice(0, 8)} />
          </div>
        </section>
      ) : null}

      {/* New arrivals */}
      {newArrivals.length > 0 ? (
        <section className="container-page py-10 lg:py-14">
          <SectionHeading
            title={t('home.newArrivals.title')}
            subtitle={t('home.newArrivals.subtitle')}
            action={
              <ButtonLink href="/shop?sort=newest" variant="ghost" size="sm">
                {t('common.viewAll')} →
              </ButtonLink>
            }
          />
          <ProductRail
            products={newArrivals}
            seeAllHref="/shop?sort=newest"
            seeAllLabel={t('common.viewAll')}
          />
        </section>
      ) : null}

      {/* Why us */}
      <section className="container-page pb-10 lg:pb-14">
        <SectionHeading title={t('home.why.title')} />
        <WhyChooseUs />
      </section>

      {/* Testimonials */}
      <section className="container-page pb-10 lg:pb-14">
        <SectionHeading
          title={t('home.testimonials.title')}
          subtitle={t('home.testimonials.subtitle')}
        />
        <Testimonials />
      </section>

      {/* Bulk enquiry */}
      <section className="container-page pb-12 lg:pb-16">
        <BulkEnquiryBanner />
      </section>
    </>
  );
}
