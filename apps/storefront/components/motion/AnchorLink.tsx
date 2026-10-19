'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@tamizh/core/utils';

/**
 * A link to a section — "/contact#visit-store", or "#order-tracking" on the
 * same page.
 *
 * From another page it navigates as usual. On the page itself it scrolls
 * there smoothly (instantly under reduced motion), landing below the sticky
 * header by the html scroll-padding. While its section is on screen the
 * link is marked current, so the nav says where the reader is.
 */
export function AnchorLink({
  href,
  className,
  activeClassName,
  children,
}: {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [path, id = ''] = href.split('#');
  const targetPath = path || pathname;
  const samePage = targetPath === pathname;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!samePage || !id) return;
    const section = document.getElementById(id);
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      // "On screen" means in the middle band of the viewport, not a sliver.
      { rootMargin: '-35% 0px -45% 0px' },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [samePage, id]);

  const active = samePage && inView;

  return (
    <Link
      href={`${targetPath}#${id}`}
      aria-current={active ? 'location' : undefined}
      className={cn(className, active && activeClassName)}
      onClick={(event) => {
        if (!samePage || !id) return;
        const section = document.getElementById(id);
        if (!section) return;
        event.preventDefault();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        window.history.replaceState(window.history.state, '', `#${id}`);
      }}
    >
      {children}
    </Link>
  );
}
