'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CategoryView } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { useLocale } from '@/components/providers/LocaleProvider';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { ChevronDownIcon } from '@/components/ui/Icons';

/**
 * One top-level category in the desktop navigation, with its submenu.
 *
 * This used to be pure CSS — `group-hover` plus `group-focus-within`. That
 * looks equivalent and is not: choosing an item performs a client-side
 * navigation, which leaves focus on the link that was clicked and the pointer
 * where it already was, so both conditions stayed true and the menu hung open
 * over the page the shopper had just asked for.
 *
 * Open state is therefore held here, and the one rule CSS could not express is
 * the important one: a route change closes the menu. The pointer not having
 * moved is exactly why it stays closed afterwards — `mouseenter` does not fire
 * again until it does.
 */
export function CategoryMenu({ category }: { category: CategoryView }) {
  const { locale } = useLocale();
  const pathname = usePathname();
  /**
   * The menu is open for one specific route. Storing the pathname it was
   * opened on makes a navigation close it as derived state, rather than as an
   * effect that fires only after the new page has already painted — the same
   * approach the mobile drawer takes.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);

  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = (item: CategoryView) => (locale === 'ta' ? item.nameTa : item.name);
  const children = category.children ?? [];
  const hasChildren = children.length > 0;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenedOn(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  /**
   * A short grace period on the way out. The submenu sits below the trigger,
   * so a pointer travelling diagonally towards it briefly leaves both.
   */
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  if (!hasChildren) {
    return (
      <Link
        href={`/categories/${category.slug}`}
        className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:text-link"
      >
        <CategoryIcon name={category.icon} className="size-4 text-brand-500" />
        {label(category)}
      </Link>
    );
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(event) => {
        // Only close when focus has left the menu entirely, not when it moves
        // between the trigger and the items inside it.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <Link
        href={`/categories/${category.slug}`}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition-colors',
          open ? 'text-link' : 'text-ink-700 hover:text-link',
        )}
      >
        <CategoryIcon name={category.icon} className="size-4 text-brand-500" />
        {label(category)}
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            'text-sm text-ink-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </Link>

      <div
        className={cn(
          'absolute left-0 top-full z-50 w-64 rounded-2xl border border-ink-100 bg-surface p-2 shadow-card-hover transition-[opacity,transform] duration-200',
          open
            ? 'visible translate-y-0 opacity-100'
            : 'invisible translate-y-1 opacity-0',
        )}
      >
        <ul>
          {children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/categories/${child.slug}`}
                // Closing here as well as on the route change means the menu
                // goes at the moment of the click rather than when the new
                // page commits, which on a slow connection is much later.
                onClick={() => setOpen(false)}
                tabIndex={open ? undefined : -1}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink-700 transition-colors hover:bg-success-50 hover:text-link"
              >
                <CategoryIcon
                  name={child.icon}
                  className="size-4 shrink-0 text-ink-400"
                />
                <span className="flex-1">{label(child)}</span>
                <span className="text-xs text-ink-400">{child.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
