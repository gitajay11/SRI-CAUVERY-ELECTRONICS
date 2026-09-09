import Link from 'next/link';
import type { CategoryView } from '@tamizh/core/types';
import type { SessionUser } from '@tamizh/core/types';
import { getI18n } from '@/i18n/server';
import { shopConfig } from '@/lib/site';
import { BrandMark } from './BrandMark';
import { SearchBar } from './SearchBar';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { HeaderActions } from './HeaderActions';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { BoltIcon, ChevronDownIcon, PhoneIcon, TruckIcon } from '@/components/ui/Icons';

/**
 * Site header.
 *
 * Three bands on desktop — a thin trust strip, the brand/search/actions row,
 * and the category navigation. On mobile it collapses to a single sticky row
 * plus a full-width search field, with categories moving into the drawer.
 */
export async function Header({
  categories,
  user,
  wishlistCount,
}: {
  categories: CategoryView[];
  user: SessionUser | null;
  wishlistCount: number;
}) {
  const { t, locale } = await getI18n();
  const label = (category: CategoryView) =>
    locale === 'ta' ? category.nameTa : category.name;

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      {/* Trust strip */}
      <div className="hidden bg-brand-800 text-brand-50 lg:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <TruckIcon className="text-sm text-gold-300" />
              {t('home.hero.badgeDelivery')}
            </span>
            <span className="flex items-center gap-1.5">
              <BoltIcon className="text-sm text-gold-300" />
              {t('home.hero.badgeCod')}
            </span>
          </p>
          <p className="flex items-center gap-5">
            <a
              href={`tel:${shopConfig.supportPhone.replace(/\s/g, '')}`}
              className="flex items-center gap-1.5 hover:text-white"
            >
              <PhoneIcon className="text-sm text-gold-300" />
              {shopConfig.supportPhone}
            </a>
            <Link href="/orders" className="hover:text-white">
              {t('order.myOrders')}
            </Link>
          </p>
        </div>
      </div>

      {/* Brand + search + actions */}
      <div className="container-page">
        <div className="flex items-center gap-2 py-2.5 sm:gap-4 lg:py-3">
          <MobileMenu
            categories={categories}
            user={user}
            supportPhone={shopConfig.supportPhone}
          />
          <BrandMark className="shrink-0" />

          <div className="ml-auto hidden max-w-xl flex-1 lg:ml-6 lg:block">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-1 lg:ml-2">
            <LanguageSwitcher className="hidden md:inline-flex" />
            <HeaderActions user={user} wishlistCount={wishlistCount} />
          </div>
        </div>

        {/* Mobile search */}
        <div className="pb-3 lg:hidden">
          <SearchBar compact />
        </div>
      </div>

      {/* Category navigation */}
      <nav
        aria-label={t('nav.categories')}
        className="hidden border-t border-ink-100 lg:block"
      >
        <div className="container-page flex items-stretch gap-1">
          <Link
            href="/shop"
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:text-brand-700"
          >
            {t('nav.shop')}
          </Link>

          {categories.map((category) => (
            <div key={category.id} className="group relative">
              <Link
                href={`/categories/${category.slug}`}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:text-brand-700 group-focus-within:text-brand-700"
              >
                <CategoryIcon name={category.icon} className="size-4 text-brand-500" />
                {label(category)}
                {category.children && category.children.length > 0 ? (
                  <ChevronDownIcon className="text-sm text-ink-400 transition-transform duration-200 group-hover:rotate-180" />
                ) : null}
              </Link>

              {category.children && category.children.length > 0 ? (
                <div className="invisible absolute left-0 top-full z-50 w-64 translate-y-1 rounded-2xl border border-ink-100 bg-surface p-2 opacity-0 shadow-card-hover transition-[opacity,transform] duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <ul>
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/categories/${child.slug}`}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
                        >
                          <CategoryIcon
                            name={child.icon}
                            className="size-4 shrink-0 text-ink-400"
                          />
                          <span className="flex-1">{label(child)}</span>
                          <span className="text-xs text-ink-400">
                            {child.productCount}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}

          <Link
            href="/shop?sort=best-selling&minDiscount=30"
            className="ml-auto flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold text-gold-700 transition-colors hover:text-gold-600"
          >
            <BoltIcon className="text-base" />
            {t('nav.offers')}
          </Link>
        </div>
      </nav>
    </header>
  );
}
