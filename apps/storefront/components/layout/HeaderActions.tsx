'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { api } from '@/lib/http';
import { useCart } from '@/components/providers/CartProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import {
  CartIcon,
  ChevronDownIcon,
  ClipboardIcon,
  HeartIcon,
  LogOutIcon,
  UserIcon,
} from '@/components/ui/Icons';

/** Header icon buttons: wishlist, account menu and the live cart badge. */
export function HeaderActions({
  user,
  wishlistCount,
}: {
  user: SessionUser | null;
  wishlistCount: number;
}) {
  const { t } = useLocale();
  const { count } = useCart();

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <Link
        href="/wishlist"
        className="relative hidden size-11 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 sm:grid"
        aria-label={`${t('nav.wishlist')}${wishlistCount > 0 ? ` (${wishlistCount})` : ''}`}
      >
        <HeartIcon className="text-xl" />
        {wishlistCount > 0 ? <Dot>{wishlistCount}</Dot> : null}
      </Link>

      <AccountMenu user={user} />

      <Link
        href="/cart"
        className="relative grid size-11 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
        aria-label={`${t('nav.cart')}${count > 0 ? ` (${count})` : ''}`}
      >
        <CartIcon className="text-xl" />
        {count > 0 ? <Dot>{count}</Dot> : null}
      </Link>
    </div>
  );
}

function Dot({ children }: { children: number }) {
  return (
    <span
      className="absolute right-1 top-1 grid min-w-[1.15rem] place-items-center rounded-full bg-gold-500 px-1 text-[0.68rem] font-bold leading-[1.15rem] text-on-action"
      aria-hidden="true"
    >
      {children > 99 ? '99+' : children}
    </span>
  );
}

function AccountMenu({ user }: { user: SessionUser | null }) {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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

  if (!user) {
    return (
      <Link
        href="/signin"
        className="grid size-11 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 lg:size-auto lg:gap-2 lg:px-3 lg:py-2.5"
        aria-label={t('nav.signIn')}
      >
        <UserIcon className="text-xl" />
        <span className="hidden text-sm font-semibold lg:inline">{t('nav.signIn')}</span>
      </Link>
    );
  }

  const signOut = async () => {
    setSigningOut(true);
    try {
      await api.post('/api/auth/logout');
      setOpen(false);
      router.push('/');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const firstName = user.name.split(' ')[0] ?? user.name;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'flex min-h-11 items-center gap-1.5 rounded-full px-2 text-ink-700 transition-colors hover:bg-ink-100',
          open && 'bg-ink-100',
        )}
      >
        <span className="grid size-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {firstName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-24 truncate text-sm font-semibold lg:inline">
          {firstName}
        </span>
        <ChevronDownIcon className="hidden text-base lg:inline" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-up overflow-hidden rounded-2xl border border-ink-100 bg-surface py-1.5 shadow-card-hover"
        >
          <div className="border-b border-ink-100 px-4 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
          </div>
          <MenuLink href="/account" onClick={() => setOpen(false)} icon={<UserIcon />}>
            {t('account.title')}
          </MenuLink>
          <MenuLink href="/orders" onClick={() => setOpen(false)} icon={<ClipboardIcon />}>
            {t('order.myOrders')}
          </MenuLink>
          <MenuLink href="/wishlist" onClick={() => setOpen(false)} icon={<HeartIcon />}>
            {t('nav.wishlist')}
          </MenuLink>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className="mt-1 flex w-full items-center gap-2.5 border-t border-ink-100 px-4 py-2.5 text-left text-sm font-medium text-danger-600 hover:bg-danger-50 disabled:opacity-60"
          >
            <LogOutIcon className="text-base" />
            {t('nav.signOut')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-success-50 hover:text-link"
    >
      <span className="text-base text-ink-400">{icon}</span>
      {children}
    </Link>
  );
}
