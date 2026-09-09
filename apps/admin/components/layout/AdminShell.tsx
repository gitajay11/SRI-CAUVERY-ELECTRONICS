'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@tamizh/core/utils';
import { ROLE_LABELS } from '@tamizh/core/permissions';
import type { Theme } from '@tamizh/core/theme';
import { api } from '@/lib/http';
import {
  isActive,
  mobileNavigation,
  visibleNavigation,
  type NavItem,
} from '@/lib/navigation';
import { LOCALE_LABELS, LOCALES } from '@/i18n/config';
import { useAdmin } from '@/components/providers/AdminProviders';
import { NavIcon } from './NavIcon';
import { AdminMark } from './AdminMark';
import { ThemeControl } from './ThemeControl';
import {
  BellIcon,
  CloseIcon,
  ExternalIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
  WifiOffIcon,
} from '@/components/ui/Icons';

/**
 * The application shell.
 *
 * Desktop gets a persistent sidebar; mobile gets a bottom bar of four
 * destinations plus a "More" drawer holding everything else. Both are built
 * from the same navigation model filtered by the viewer's permissions, so a
 * stock clerk and the owner see different — but always coherent — menus.
 */
export function AdminShell({
  children,
  storefrontUrl,
  unreadCount,
  theme,
}: {
  children: React.ReactNode;
  storefrontUrl: string;
  unreadCount: number;
  theme: Theme;
}) {
  const { t, session, online } = useAdmin();
  const pathname = usePathname();
  const permissions = new Set(session.permissions);

  const sections = visibleNavigation(permissions);
  const bottomItems = mobileNavigation(permissions);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the route changes.
  const [drawerRoute, setDrawerRoute] = useState<string | null>(null);
  const isDrawerOpen = drawerOpen && drawerRoute === pathname;
  const openDrawer = () => {
    setDrawerRoute(pathname);
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-dvh lg:flex">
      <a href="#main" className="sr-focusable">
        {t('common.skipToContent')}
      </a>

      {/* Desktop sidebar.

          Carbon and gold in both themes — it is the crest, not a panel, so it
          does not follow the light/dark ramp. `on-carbon` re-points the tone
          ramp at its dark values for this subtree, which is why ordinary
          `text-slate-*` utilities keep reading correctly inside it. */}
      <aside className="no-print on-carbon sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-carbon-700 bg-carbon-900 lg:flex">
        <Link
          href="/"
          className="flex items-center gap-3 border-b border-carbon-700 px-4 py-4 transition-colors hover:bg-carbon-800"
        >
          <AdminMark className="size-9 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-gold-300">
              {t('app.name')}
            </span>
            <span className="block truncate text-xs text-slate-500">
              {t('app.shopName')}
            </span>
          </span>
        </Link>

        <nav aria-label={t('nav.menu')} className="flex-1 overflow-y-auto px-2.5 py-3">
          {sections.map((section) => (
            <div key={section.labelKey} className="mb-5 last:mb-0">
              <p className="mb-1 px-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t(section.labelKey)}
              </p>
              <ul className="space-y-px">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <SidebarLink item={item} active={isActive(pathname, item)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-carbon-700 p-2.5">
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-carbon-700 hover:text-slate-900"
          >
            <ExternalIcon className="text-base" />
            {t('nav.viewShop')}
            <span className="ms-auto text-slate-400" aria-hidden="true">
              ↗
            </span>
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar unreadCount={unreadCount} theme={theme} onOpenDrawer={openDrawer} />

        {!online ? (
          <div
            role="status"
            className="no-print flex items-center justify-center gap-2 bg-carbon-900 px-4 py-2 text-sm font-medium text-gold-300"
          >
            <WifiOffIcon className="text-base" />
            {t('offline.banner')}
          </div>
        ) : null}

        <main id="main" className="container-admin flex-1 py-5 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label={t('nav.menu')}
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="flex">
          {bottomItems.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.65rem] font-medium',
                    active ? 'text-link' : 'text-slate-500',
                  )}
                >
                  <NavIcon name={item.icon} className="size-5" />
                  <span className="max-w-full truncate">{t(item.labelKey)}</span>
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
          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={openDrawer}
              aria-expanded={isDrawerOpen}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.65rem] font-medium text-slate-500"
            >
              <MenuIcon className="size-5" />
              <span className="max-w-full truncate">{t('nav.more')}</span>
            </button>
          </li>
        </ul>
      </nav>

      {isDrawerOpen ? (
        <MoreDrawer
          storefrontUrl={storefrontUrl}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const { t } = useAdmin();
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors',
        // Gold leads: the page you are on is the one gold thing in the column,
        // which makes the current position readable at a glance rather than
        // requiring the label to be read.
        active
          ? 'bg-action font-semibold text-on-action'
          : 'text-slate-600 hover:bg-carbon-700 hover:text-slate-900',
      )}
    >
      <NavIcon
        name={item.icon}
        className={cn(
          'size-4.5 shrink-0 transition-colors',
          !active && 'text-slate-400 group-hover:text-gold-400',
        )}
      />
      <span className="truncate">{t(item.labelKey)}</span>
    </Link>
  );
}

function TopBar({
  unreadCount,
  theme,
  onOpenDrawer,
}: {
  unreadCount: number;
  theme: Theme;
  onOpenDrawer: () => void;
}) {
  const { t, session, can } = useAdmin();

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-surface/95 backdrop-blur">
      <div className="container-admin flex items-center gap-2 py-2.5">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label={t('nav.menu')}
          className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <MenuIcon className="text-xl" />
        </button>

        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <AdminMark className="size-8" />
          <span className="text-sm font-bold text-slate-900">{t('app.name')}</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <GlobalSearchButton />

          {can('notifications.view') ? (
            <Link
              href="/notifications"
              aria-label={`${t('nav.notifications')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              className="relative grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <BellIcon className="text-xl" />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 grid min-w-[1.1rem] place-items-center rounded-full bg-action px-1 text-[0.65rem] font-bold leading-[1.1rem] text-on-action ring-2 ring-surface">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          <AccountMenu
            name={session.name}
            email={session.email}
            role={session.role}
            theme={theme}
          />
        </div>
      </div>
    </header>
  );
}

/** Opens global search. Ctrl/⌘+K is bound at the shell level. */
function GlobalSearchButton() {
  const { t } = useAdmin();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('global-search-trigger')?.click();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Link
      id="global-search-trigger"
      href="/search"
      aria-label={t('common.search')}
      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-slate-500 hover:bg-slate-100 sm:min-w-56 sm:border sm:border-slate-300 sm:bg-slate-50"
    >
      <SearchIcon className="text-lg" />
      <span className="hidden text-sm sm:inline">{t('common.search')}</span>
      <kbd className="ml-auto hidden rounded border border-slate-300 bg-surface px-1.5 py-0.5 font-mono text-[0.65rem] text-slate-500 sm:inline">
        ⌘K
      </kbd>
    </Link>
  );
}

function AccountMenu({
  name,
  email,
  role,
  theme,
}: {
  name: string;
  email: string;
  role: keyof typeof ROLE_LABELS;
  theme: Theme;
}) {
  const { t, locale, setLocale } = useAdmin();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const signOut = async () => {
    setBusy(true);
    try {
      await api.post('/api/admin/auth/logout');
    } finally {
      // A full page load rather than a client navigation: signing out has to
      // leave nothing of the previous session behind, including the router's
      // cached server-rendered payloads.
      window.location.assign(new URL('/login', window.location.origin));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'flex min-h-10 items-center gap-2 rounded-lg px-1.5 text-slate-700 hover:bg-slate-100',
          open && 'bg-slate-100',
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-28 truncate text-sm font-medium lg:inline">
          {name.split(' ')[0]}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-64 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-surface py-1 shadow-overlay"
        >
          <div className="border-b border-slate-100 px-4 pb-2.5 pt-2">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
            <p className="mt-1 text-xs font-medium text-link">
              {ROLE_LABELS[role][locale]}
            </p>
          </div>

          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="mb-1.5 text-xs font-medium text-slate-500">
              {t('theme.label')}
            </p>
            <ThemeControl
              current={theme}
              label={t('theme.label')}
              labels={{
                system: t('theme.system'),
                light: t('theme.light'),
                dark: t('theme.dark'),
              }}
            />
          </div>

          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="mb-1.5 text-xs font-medium text-slate-500">
              {t('nav.language')}
            </p>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  lang={code}
                  onClick={() => setLocale(code)}
                  aria-pressed={locale === code}
                  className={cn(
                    'min-h-8 rounded-md px-3 text-xs font-semibold transition-colors',
                    code === 'ta' && 'font-tamil',
                    locale === code
                      ? 'bg-surface text-link shadow-sm'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  {LOCALE_LABELS[code]}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <UserIcon className="text-base text-slate-400" />
            {t('nav.myAccount')}
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={busy}
            className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-critical-600 hover:bg-critical-50 disabled:opacity-60"
          >
            <LogOutIcon className="text-base" />
            {t('nav.signOut')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Full navigation on mobile — everything the bottom bar could not fit. */
function MoreDrawer({
  storefrontUrl,
  onClose,
}: {
  storefrontUrl: string;
  onClose: () => void;
}) {
  const { t, session } = useAdmin();
  const pathname = usePathname();
  const sections = visibleNavigation(new Set(session.permissions));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="absolute inset-0 bg-carbon-950/60 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menu')}
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] animate-slide-up overflow-y-auto rounded-t-2xl bg-surface"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-surface px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">{t('nav.menu')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <CloseIcon className="text-xl" />
          </button>
        </div>

        <div className="px-3 py-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          {sections.map((section) => (
            <div key={section.labelKey} className="mb-4">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t(section.labelKey)}
              </p>
              <ul className="grid grid-cols-2 gap-1.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex min-h-12 items-center gap-2.5 rounded-lg px-3 text-sm font-medium',
                          active
                            ? 'bg-success-50 text-link'
                            : 'text-slate-700 hover:bg-slate-100',
                        )}
                      >
                        <NavIcon name={item.icon} className="size-4.5 shrink-0 text-slate-400" />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <ExternalIcon className="size-4.5 text-slate-400" />
            {t('nav.viewShop')}
          </a>
        </div>
      </div>
    </div>
  );
}
