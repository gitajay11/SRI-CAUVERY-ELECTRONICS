import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ChevronRightIcon } from '@/components/ui/Icons';

/**
 * Breadcrumb trail plus its structured data, so search results show the path
 * rather than a bare URL. The last crumb is the current page and is not a link.
 */
export function Breadcrumbs({
  trail,
}: {
  trail: { name: string; path: string }[];
}) {
  if (trail.length === 0) return null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-500">
          {trail.map((crumb, index) => {
            const isLast = index === trail.length - 1;
            return (
              <li key={crumb.path} className="flex items-center gap-1">
                {index > 0 ? (
                  <ChevronRightIcon className="text-xs text-ink-300" aria-hidden="true" />
                ) : null}
                {isLast ? (
                  <span aria-current="page" className="font-medium text-ink-700">
                    {crumb.name}
                  </span>
                ) : (
                  <Link href={crumb.path} className="hover:text-link hover:underline">
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
