'use client';

import { useSyncExternalStore } from 'react';

/**
 * Live connectivity status.
 *
 * `navigator.onLine` is external state, so it is read through
 * `useSyncExternalStore` rather than copied into `useState` inside an effect.
 * That avoids the extra render on mount and, more importantly, keeps every
 * consumer (the banner, the offline page, checkout) reading exactly the same
 * value at the same moment.
 *
 * The server snapshot is `true`: markup is rendered as if online, and the
 * first client render corrects it if it is not.
 */

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
