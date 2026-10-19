'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronRightIcon,
  ClipboardIcon,
  CloseIcon,
  DownloadIcon,
  HeartIcon,
  MapPinIcon,
  MenuIcon,
  PhoneIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useInstall } from '@/components/pwa/InstallProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { usePresence } from '@/hooks/usePresence';

/**
 * Slide-in navigation drawer for phones and tablets.
 *
 * Traps focus while open, closes on Escape and on route change, and locks
 * background scrolling — the three things that make a drawer feel native
 * rather than like a page that moved sideways.
 *
 * It is rendered through a portal onto `document.body`, and that is not a
 * stylistic choice. This component lives inside the header, and the header
 * carries `backdrop-blur` — which, like `transform` and `filter`, makes an
 * element the containing block for any `position: fixed` descendant. Left in
 * place the drawer resolved `inset-0` against the header's own box, so a
 * full-screen menu rendered 375×120 with nine navigation items crushed into
 * thirty-two pixels. The portal moves it out from under that.
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
  // Slides out (quicker than it came in) before it unmounts.
  const drawer = usePresence(open);

  const [expanded, setExpanded] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);


  const { canInstall, install } = useInstall();
  const { toast } = useToast();

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

  /**
   * "Visit store" from /contact itself changes only the hash, so the route
   * stays the same and the drawer has to close itself. The jump to the
   * section also happens while the drawer still holds the page's scroll
   * lock, so it is repeated once the drawer has gone — as a jump, the same
   * as arriving from another page: a smooth scroll started straight after
   * the lock lifts can be dropped by the browser.
   */
  const goToVisitStore = () => {
    setOpen(false);
    if (pathname !== '/contact') return;
    window.setTimeout(() => {
      document.getElementById('visit-store')?.scrollIntoView();
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('nav.menu')}
        aria-expanded={open}
        className="grid size-11 shrink-0 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 lg:hidden"
      >
        <MenuIcon className="text-2xl" />
      </button>

      {/* The drawer only opens from a click, so by the time this runs the
          document exists — no mounted flag needed to make the portal safe. */}
      {drawer.mounted
        ? createPortal(
        <div className={cn('fixed inset-0 z-[60] lg:hidden', drawer.closing && 'pointer-events-none')}>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
            className={cn(
              'absolute inset-0 bg-carbon-950/55 backdrop-blur-[2px]',
              drawer.closing ? 'animate-backdrop-out' : 'animate-backdrop-in',
            )}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.menu')}
            className={cn(
              'absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-paper shadow-2xl',
              drawer.closing ? 'animate-drawer-out' : 'animate-drawer-in',
            )}
            style={{
              // Notched phones: the drawer runs edge to edge, so its own
              // padding has to clear the cutout and the home indicator.
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-surface px-4 py-3">
              <BrandMark size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="grid size-11 shrink-0 place-items-center rounded-full text-ink-600 transition-colors hover:bg-ink-100"
              >
                <CloseIcon className="text-xl" />
              </button>
            </div>

            {/* Who you are, before what you can do. Signed out, this is the
                one thing most worth offering. */}
            <Link
              href={user ? '/account' : '/signin'}
              className="flex items-center gap-3 border-b border-ink-100 bg-success-50 px-4 py-3.5 transition-colors active:bg-success-100"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-action text-sm font-bold text-on-action">
                {user ? user.name.charAt(0).toUpperCase() : <UserIcon className="text-lg" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink-900">
                  {user ? user.name : t('nav.signIn')}
                </span>
                <span className="block truncate text-xs text-ink-500">
                  {user ? user.email : t('nav.signInSubtitle')}
                </span>
              </span>
              <ChevronRightIcon className="shrink-0 text-base text-ink-400" />
            </Link>

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
                <li>
                  <DrawerLink href="/contact#visit-store" onClick={goToVisitStore}>
                    <MapPinIcon className="size-5 text-ink-400" />
                    {t('nav.visitStore')}
                  </DrawerLink>
                </li>
              </ul>
            </nav>

            <div className="space-y-3 border-t border-ink-100 bg-surface px-4 py-4">
              {canInstall ? (
                <button
                  type="button"
                  onClick={async () => {
                    const outcome = await install();
                    if (outcome === 'ios') {
                      // Safari offers no API, so the only honest thing is to
                      // say where the button is.
                      toast(t('pwa.iosHint'), { tone: 'info' });
                    }
                    if (outcome === 'accepted') setOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-action text-sm font-bold text-on-action transition-colors hover:bg-action-hover"
                >
                  <DownloadIcon className="text-base" />
                  {t('pwa.installApp')}
                </button>
              ) : null}

              <div className="flex items-center justify-between gap-2">
                <LanguageSwitcher />
                <ThemeToggle current={theme} />
              </div>

              <a
                href={`tel:${supportPhone.replace(/\s/g, '')}`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-action-edge/40 bg-success-50 text-sm font-semibold text-link"
              >
                <PhoneIcon className="text-base" />
                {supportPhone}
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}

function DrawerLink({
  href,
  children,
  variant = 'top',
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'top' | 'child';
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
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
