'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@tamizh/core/utils';
import { useCart } from '@/components/providers/CartProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { CartIcon, GridIcon, HeartIcon, HomeIcon, UserIcon } from '@/components/ui/Icons';

/**
 * Mobile bottom navigation.
 *
 * Five destinations, thumb-reachable, with the cart badge mirrored from the
 * header. Hidden on checkout so nothing competes with "Place order", and
 * hidden entirely on the admin routes.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();
  const { t } = useLocale();

  const hidden = pathname.startsWith('/admin') || pathname.startsWith('/checkout');
  if (hidden) return null;

  // Five destinations is the practical maximum before labels start truncating
  // at 360px; Shop is reachable from Categories and from the header.
  const items = [
    { href: '/', label: t('nav.home'), icon: <HomeIcon />, exact: true },
    { href: '/categories', label: t('nav.categoriesShort'), icon: <GridIcon /> },
    { href: '/wishlist', label: t('nav.wishlistShort'), icon: <HeartIcon /> },
    { href: '/cart', label: t('nav.cart'), icon: <CartIcon />, badge: count },
    { href: '/account', label: t('nav.account'), icon: <UserIcon /> },
  ];

  return (
    <nav
      aria-label={t('nav.menu')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            // Flex items default to min-width:auto, so a long label pushes
            // the bar wider than the viewport instead of truncating.
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.68rem] font-medium transition-colors',
                  active ? 'text-brand-700' : 'text-ink-500',
                )}
              >
                <span className="relative text-[1.35rem]">
                  {item.icon}
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -right-2 -top-1 grid min-w-[1.05rem] place-items-center rounded-full bg-gold-500 px-1 text-[0.62rem] font-bold leading-[1.05rem] text-ink-900">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{item.label}</span>
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-600"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
