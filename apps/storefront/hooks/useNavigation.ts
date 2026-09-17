'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useSyncExternalStore, useTransition } from 'react';

/**
 * Programmatic navigation that can be seen.
 *
 * `router.push()` and `router.refresh()` return at once and give no sign of
 * the round trip they start; until the new tree streams in, the screen does
 * not change. Wrapping each in a transition makes that wait observable:
 * `pending` stays true until the new route — or the refreshed page — has
 * actually rendered, so a button can keep spinning until the thing it
 * changed is on screen, not merely until the API said yes.
 *
 * A push or replace is also announced to the page-wide progress spinner,
 * which otherwise only notices link clicks: a new page is coming, and the
 * shopper should see the same sign they see after tapping a link. A refresh
 * is not announced — it changes something in place, and the control that
 * asked for it is the right place to show the wait.
 */

/** How many components are mid-way through a programmatic page change. */
let leaving = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return leaving > 0;
}

function getServerSnapshot(): boolean {
  return false;
}

/** Whether any component has started a page change that has not landed. */
export function useLeavingPage(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

interface PushOptions {
  scroll?: boolean;
  /**
   * Also re-render the server tree. Wanted after signing in or out: the
   * header and every page read the session on the server, and a push alone
   * would show the destination as the previous visitor saw it.
   */
  refresh?: boolean;
}

export function useNavigation() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // What the current transition is doing, since one transition serves both.
  const kind = useRef<'leave' | 'refresh'>('refresh');

  useEffect(() => {
    if (!pending || kind.current !== 'leave') return;
    leaving += 1;
    listeners.forEach((listener) => listener());
    return () => {
      leaving -= 1;
      listeners.forEach((listener) => listener());
    };
  }, [pending]);

  const push = useCallback(
    (href: string, options: PushOptions = {}) => {
      kind.current = 'leave';
      startTransition(() => {
        router.push(href, { scroll: options.scroll });
        if (options.refresh) router.refresh();
      });
    },
    [router],
  );

  const replace = useCallback(
    (href: string, options: PushOptions = {}) => {
      kind.current = 'leave';
      startTransition(() => {
        router.replace(href, { scroll: options.scroll });
        if (options.refresh) router.refresh();
      });
    },
    [router],
  );

  const refresh = useCallback(() => {
    kind.current = 'refresh';
    startTransition(() => router.refresh());
  }, [router]);

  return { push, replace, refresh, pending };
}
