import { ViewTransition } from 'react';

/**
 * The content area's boundary for page transitions.
 *
 * Used by the route templates, which remount on every page change, so this
 * boundary leaves with the old page and enters with the new one. The class
 * is always "page"; which way it slides is decided in CSS from
 * `<html data-nav>` (see NavigationMotion). Updates within a page — a
 * refresh, a filter, a skeleton giving way to content — are left alone.
 *
 * Where view transitions are missing, the same element plays a CSS
 * entrance instead (.page-transition in globals.css).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div className="page-transition">{children}</div>
    </ViewTransition>
  );
}
