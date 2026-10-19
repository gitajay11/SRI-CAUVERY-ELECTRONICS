'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { navDirection } from '@/lib/motion';
import { setActiveSharedKey } from './SharedElement';

/**
 * The navigation half of the motion system. Renders nothing.
 *
 * Direction. Every page change writes `<html data-nav>`: forward, back, tab
 * or fade, worked out from where it goes (see `navDirection`). The page
 * transition CSS reads it. It is set from the history change itself — a
 * push or replace from the router, or the browser's back and forward — so
 * links, buttons, redirects and the back gesture all get a direction
 * without any of them being tagged. The router changes history while the
 * view transition is capturing the new page, before any animation starts,
 * so the direction is in place when the slide begins. Back and forward
 * themselves are committed without a view transition, so for those the new
 * page plays a CSS entrance from the same direction (data-nav-css).
 *
 * Shared elements. A tap on a link marks the shared-element source inside
 * it (or inside the card around it) as the one to carry across.
 *
 * Focus. After a page change, focus moves to the new page's heading, so a
 * screen reader starts there and a keyboard user is not left on a link
 * that no longer exists.
 */
export function NavigationMotion() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    let current = window.location.pathname;
    const root = document.documentElement;

    const arrive = (to: string, { fromHistory = false } = {}) => {
      if (to === current) return;
      root.dataset.nav = navDirection(current, to);
      // Back and forward are committed without a view transition (so the
      // browser can restore scroll), so those get the CSS entrance instead.
      if (fromHistory) root.dataset.navCss = '';
      else delete root.dataset.navCss;
      current = to;
    };

    const pathOf = (url: string | URL | null | undefined): string | null => {
      if (url == null) return null;
      try {
        return new URL(url, window.location.href).pathname;
      } catch {
        return null;
      }
    };

    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    window.history.pushState = function pushState(data, unused, url) {
      const to = pathOf(url);
      if (to) arrive(to);
      return originalPush.call(this, data, unused, url);
    };
    window.history.replaceState = function replaceState(data, unused, url) {
      const to = pathOf(url);
      if (to) arrive(to);
      return originalReplace.call(this, data, unused, url);
    };

    const onPopState = () => arrive(window.location.pathname, { fromHistory: true });

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!link) return;
      const scope = link.closest('[data-shared-scope]') ?? link;
      const source = scope.querySelector<HTMLElement>('[data-shared-key]');
      if (source?.dataset.sharedKey) setActiveSharedKey(source.dataset.sharedKey);
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onClick, true);
    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // An in-page jump keeps its own target; only a new page moves focus.
    if (window.location.hash) return;
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('#main h1');
      if (!heading) return;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
