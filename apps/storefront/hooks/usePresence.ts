'use client';

import { useEffect, useState } from 'react';

/**
 * Keeps an overlay mounted while it animates out.
 *
 * `mounted` stays true for `exitMs` after `open` turns false, with
 * `closing` true in between, so the overlay can play its exit animation
 * (shorter than its entry — see the motion tokens) before it goes.
 * Reopening during the exit simply cancels it.
 */
export const OVERLAY_EXIT_MS = 224; // --motion-spring-exit

export function usePresence(open: boolean, exitMs = OVERLAY_EXIT_MS): {
  mounted: boolean;
  closing: boolean;
} {
  const [rendered, setRendered] = useState(open);
  // Opening is immediate: adjust during render rather than a frame later.
  if (open && !rendered) setRendered(true);
  const closing = rendered && !open;

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => setRendered(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [closing, exitMs]);

  return { mounted: rendered || open, closing };
}
