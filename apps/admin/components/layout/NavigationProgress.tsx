'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SpinnerIcon } from '@/components/ui/Icons';

/**
 * A spinner for the gap between clicking a link and the next page arriving.
 *
 * Every panel route is server-rendered on demand and queries the database, so
 * a navigation takes as long as it takes — and until it lands the browser
 * shows the *old* page, unchanged. Nothing is broken, but nothing says so
 * either, and the honest reading of a screen that does not move is that the
 * click missed.
 *
 * Deliberately not a `loading.tsx`. That is the framework's own answer and it
 * would be the better one, except that a loading boundary flushes the
 * response — and its 200 — before the page runs, so the seven panel routes
 * that call `notFound()` would start answering 200 for records that do not
 * exist. Trading correct status codes for a spinner is not a trade worth
 * making.
 *
 * Navigation is therefore observed the only way it can be from outside: a
 * click on an internal link starts it, and the pathname changing ends it.
 */

/** Long enough that an instant navigation never flashes a spinner. */
const SHOW_AFTER_MS = 180;

/** A stuck spinner is worse than none; nothing here should outlive this. */
const GIVE_UP_AFTER_MS = 20_000;

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Only a plain left click navigates; the rest the browser handles
      // itself, in a new tab or not at all.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, or a jump within it: nothing is being fetched.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      clearTimers();
      timers.current.push(setTimeout(() => setPending(true), SHOW_AFTER_MS));
      timers.current.push(setTimeout(() => setPending(false), GIVE_UP_AFTER_MS));
    };

    // Capture, not bubble. Next's <Link> calls preventDefault() to take the
    // navigation client-side, and React's own listener sits on the root
    // container — so by the time a bubbling listener on `document` runs,
    // every internal link already looks like a cancelled click. Capture runs
    // first, while the event still describes what was clicked.
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clearTimers();
    };
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
     The arrival of a new route is precisely the event being waited on, and it
     is only observable after the render that carries it. */
  useEffect(() => {
    clearTimers();
    setPending(false);
  }, [pathname, searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!pending) return null;

  return (
    <div
      // Purely an announcement: it must never swallow a click on the page
      // underneath, which is still perfectly usable while the next one loads.
      className="pointer-events-none fixed inset-0 z-[70] grid place-items-center"
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-2.5 rounded-full bg-carbon-900/90 px-4 py-2.5 text-sm font-medium text-gold-300 shadow-overlay backdrop-blur-sm">
        <SpinnerIcon className="text-base" />
        <span className="sr-only">Loading</span>
      </span>
    </div>
  );
}
