'use client';

import { useId, useSyncExternalStore, ViewTransition } from 'react';
import { cn } from '@tamizh/core/utils';

/**
 * Shared-element transitions: one element that morphs, in position and
 * size, from where it was tapped to where it lands on the next page.
 *
 * The source sits on a listing — a product card's image, a category tile —
 * and takes the shared name only when it is the one that was tapped, so a
 * product shown twice on the home page never gives the browser two
 * elements with one name. The target, on the detail page, always has it.
 */

/** The element on the listing. `name` is shared with its SharedElementTarget. */
export function SharedElementSource({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: React.ReactNode;
}) {
  const instance = useId();
  const key = `${name}|${instance}`;
  const active = useActiveSharedKey() === key;

  return (
    <ViewTransition name={active ? name : undefined} share="morph" default="none">
      <span data-shared-key={key} className={cn('block', className)}>
        {children}
      </span>
    </ViewTransition>
  );
}

/** The element on the destination page. */
export function SharedElementTarget({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ViewTransition name={name} share="morph" default="none">
      <div className={className}>{children}</div>
    </ViewTransition>
  );
}

/**
 * The one source element that should carry across the next navigation —
 * the product card that was tapped, say.
 *
 * A view-transition name must be unique on the page, and the same product
 * can appear twice on one page (in "Featured" and "Best sellers"), so only
 * the pressed instance takes the name. It keeps it afterwards, so coming
 * back morphs the image home into the same card.
 */
let activeSharedKey: string | null = null;
const listeners = new Set<() => void>();

export function setActiveSharedKey(key: string | null): void {
  if (key === activeSharedKey) return;
  activeSharedKey = key;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useActiveSharedKey(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => activeSharedKey,
    () => null,
  );
}
