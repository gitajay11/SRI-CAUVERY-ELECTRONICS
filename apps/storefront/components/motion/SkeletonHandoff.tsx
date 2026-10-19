import { ViewTransition } from 'react';

/**
 * Wraps a route's loading skeleton. When the real content arrives, the
 * skeleton fades out over it rather than vanishing: a crossfade with no
 * jump, since each skeleton is laid out like the page it stands for.
 *
 * On the way in it travels with the page transition like everything else.
 */
export function SkeletonHandoff({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition exit="skeleton-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
