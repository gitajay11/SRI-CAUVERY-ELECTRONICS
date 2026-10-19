'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Sections, and cards in a grid, fade up once as they scroll into view.
 *
 * Elements opt in with `data-reveal`. Only what starts below the fold is
 * hidden and waits ("pending"); what is already on screen is shown at once
 * ("shown"), so nothing visible ever blinks out after the page paints, and
 * nothing is hidden until this script has run. Coming back to a page shows
 * everything, since the shopper has already seen it.
 *
 * One IntersectionObserver for the whole app, and a MutationObserver so
 * content streamed in after navigation is picked up too.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          element.dataset.revealState = 'in';
          io.unobserve(element);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );

    const scan = () => {
      const back = document.documentElement.dataset.nav === 'back';
      const fold = window.innerHeight;
      for (const element of document.querySelectorAll<HTMLElement>(
        '[data-reveal]:not([data-reveal-state])',
      )) {
        const top = element.getBoundingClientRect().top;
        if (back || top < fold) {
          element.dataset.revealState = 'shown';
        } else {
          element.dataset.revealState = 'pending';
          io.observe(element);
        }
      }
    };

    scan();
    let frame = 0;
    const mo = new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        scan();
      });
    });
    const main = document.getElementById('main');
    if (main) mo.observe(main, { childList: true, subtree: true });

    return () => {
      // Anything still waiting is about to lose its observer: show it rather
      // than leave it invisible, in case it outlives this page.
      for (const element of document.querySelectorAll<HTMLElement>(
        '[data-reveal-state="pending"]',
      )) {
        element.dataset.revealState = 'shown';
      }
      io.disconnect();
      mo.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
