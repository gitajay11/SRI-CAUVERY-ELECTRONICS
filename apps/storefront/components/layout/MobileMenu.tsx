'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CategoryView } from '@tamizh/core/types';
import type { SessionUser } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { useLocale } from '@/components/providers/LocaleProvider';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { Theme } from '@tamizh/core/theme';
import { ThemeToggle } from './ThemeToggle';
import {
  ChevronDownIcon,
  ClipboardIcon,
  CloseIcon,
  HeartIcon,
  MenuIcon,
  PhoneIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

/**
 * Slide-in navigation drawer for phones and tablets.
 *
 * Traps focus while open, closes on Escape and on route change, and locks
 * background scrolling — the three things that make a drawer feel native
 * rather than like a page that moved sideways.
 */
export function MobileMenu({
  categories,
  user,
  supportPhone,
  theme,
}: {
  categories: CategoryView[];
  user: SessionUser | null;
  supportPhone: string;
  theme: Theme;
}) {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  /**
   * The drawer is open for one specific route: storing the pathname it was
   * opened on means a navigation closes it as a matter of derived state,
   * with no effect that fires after the new page has already painted.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // setOpenedOn rather than setOpen: the state setter is stable, so the
        // effect does not have to depend on a function rebuilt every render.
        setOpenedOn(null);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const label = (category: CategoryView) =>
    locale === 'ta' ? category.nameTa : category.name;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('nav.menu')}
        aria-expanded={open}
        className="grid size-11 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 lg:hidden"
      >
        <MenuIcon className="text-2xl" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-carbon-900/45 backdrop-blur-[2px]"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.menu')}
            className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-paper shadow-2xl"
            style={{ animation: 'te-fade-up 0.25s var(--ease-out-soft) both' }}
          >
            <div className="flex items-center justify-between border-b border-ink-100 bg-surface px-4 py-3">
              <BrandMark size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="grid size-10 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
              >
                <CloseIcon className="text-xl" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              <ul className="space-y-1">
                <li>
                  <DrawerLink href="/shop">{t('nav.shop')}</DrawerLink>
                </li>
                {categories.map((category) => (
                  <li key={category.id}>
                    {category.children && category.children.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((current) =>
                              current === category.id ? null : category.id,
                            )
                          }
                          aria-expanded={expanded === category.id}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[0.95rem] font-semibold text-ink-800 hover:bg-ink-100"
                        >
                          <CategoryIcon
                            name={category.icon}
                            className="size-5 shrink-0 text-link"
                          />
                          <span className="flex-1">{label(category)}</span>
                          <ChevronDownIcon
                            className={cn(
                              'text-base text-ink-400 transition-transform duration-200',
                              expanded === category.id && 'rotate-180',
                            )}
                          />
                        </button>
                        {expanded === category.id ? (
                          <ul className="mb-1 ml-6 space-y-0.5 border-l border-ink-200 pl-3">
                            <li>
                              <DrawerLink
                                href={`/categories/${category.slug}`}
                                variant="child"
                              >
                                {t('common.viewAll')} · {label(category)}
                              </DrawerLink>
                            </li>
                            {category.children.map((child) => (
                              <li key={child.id}>
                                <DrawerLink
                                  href={`/categories/${child.slug}`}
                                  variant="child"
                                >
                                  {label(child)}
                                  <span className="ml-auto text-xs text-ink-400">
                                    {child.productCount}
                                  </span>
                                </DrawerLink>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    ) : (
                      <DrawerLink href={`/categories/${category.slug}`}>
                        <CategoryIcon
                          name={category.icon}
                          className="size-5 shrink-0 text-link"
                        />
                        {label(category)}
                      </DrawerLink>
                    )}
                  </li>
                ))}
              </ul>

              <hr className="my-4 border-ink-200" />

              <ul className="space-y-1">
                <li>
                  <DrawerLink href={user ? '/account' : '/signin'}>
                    <UserIcon className="size-5 text-ink-400" />
                    {user ? t('account.title') : t('nav.signIn')}
                  </DrawerLink>
                </li>
                <li>
                  <DrawerLink href="/orders">
                    <ClipboardIcon className="size-5 text-ink-400" />
                    {t('order.myOrders')}
                  </DrawerLink>
                </li>
                <li>
                  <DrawerLink href="/wishlist">
                    <HeartIcon className="size-5 text-ink-400" />
                    {t('nav.wishlist')}
                  </DrawerLink>
                </li>
                <li>
                  <DrawerLink href="/about">{t('nav.about')}</DrawerLink>
                </li>
                <li>
                  <DrawerLink href="/contact">{t('nav.contact')}</DrawerLink>
                </li>
              </ul>
            </nav>

            <div className="space-y-3 border-t border-ink-100 bg-surface px-4 py-4">
              <LanguageSwitcher className="w-full justify-center" />
              <ThemeToggle current={theme} />
              <a
                href={`tel:${supportPhone.replace(/\s/g, '')}`}
                className="flex items-center justify-center gap-2 rounded-full border border-action-edge/40 bg-success-50 py-2.5 text-sm font-semibold text-link"
              >
                <PhoneIcon className="text-base" />
                {supportPhone}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DrawerLink({
  href,
  children,
  variant = 'top',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'top' | 'child';
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-ink-100',
        variant === 'top'
          ? 'text-[0.95rem] font-semibold text-ink-800'
          : 'py-2.5 text-sm text-ink-600',
      )}
    >
      {children}
    </Link>
  );
}
