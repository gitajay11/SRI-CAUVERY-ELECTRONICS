import type { ReactNode } from 'react';
import { formatDate } from '@tamizh/core/utils';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';

/**
 * Layout for policy and information pages.
 *
 * Long-form text gets a narrower measure than the shop grid — roughly 70
 * characters — because policy pages are actually read, not scanned.
 */
export function LegalPage({
  title,
  intro,
  updatedAt,
  breadcrumb,
  children,
}: {
  title: string;
  intro?: string;
  updatedAt?: string;
  breadcrumb: { name: string; path: string }[];
  children: ReactNode;
}) {
  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs trail={breadcrumb} />
      <article className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-ink-200 pb-6">
          <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl">{title}</h1>
          {intro ? (
            <p className="mt-3 text-base leading-relaxed text-ink-600">{intro}</p>
          ) : null}
          {updatedAt ? (
            <p className="mt-3 text-sm text-ink-400">
              Last updated: {formatDate(updatedAt)}
            </p>
          ) : null}
        </header>
        <div className="space-y-8">{children}</div>
      </article>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-ink-900">{title}</h2>
      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-ink-700">
        {children}
      </div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2 text-[0.95rem] leading-relaxed text-ink-700 marker:text-brand-400">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
