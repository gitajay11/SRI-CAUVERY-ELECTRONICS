import Image from 'next/image';
import Link from 'next/link';
import type { CategoryView, Locale } from '@tamizh/core/types';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

/**
 * Category browsing block.
 *
 * Top-level groups become large tiles; their children render as chips beneath,
 * so a shopper can jump straight to "Chargers" or "Wedding Return Gifts"
 * without a second page load.
 */
export function CategoryShowcase({
  categories,
  locale,
  viewAllLabel,
}: {
  categories: CategoryView[];
  locale: Locale;
  viewAllLabel: string;
}) {
  const label = (category: CategoryView) =>
    locale === 'ta' ? category.nameTa : category.name;
  const description = (category: CategoryView) =>
    locale === 'ta' ? category.descriptionTa : category.description;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {categories.map((category) => (
        <section
          key={category.id}
          className="overflow-hidden rounded-card border border-ink-100 bg-surface shadow-card transition-shadow hover:shadow-card-hover"
        >
          <Link
            href={`/categories/${category.slug}`}
            className="group relative flex items-center gap-4 bg-brand-50/70 p-4 sm:p-5"
          >
            {category.imageUrl ? (
              <Image
                src={category.imageUrl}
                alt=""
                width={96}
                height={96}
                className="size-16 shrink-0 rounded-xl object-cover shadow-sm sm:size-20"
              />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-surface text-brand-600 shadow-sm sm:size-20">
                <CategoryIcon name={category.icon} className="size-8" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold text-ink-900 group-hover:text-brand-700">
                {label(category)}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-sm text-ink-500">
                {description(category)}
              </span>
              <span className="mt-1.5 block text-xs font-semibold text-brand-600">
                {category.productCount ?? 0} products →
              </span>
            </span>
          </Link>

          {category.children && category.children.length > 0 ? (
            <ul className="flex flex-wrap gap-2 p-4 sm:p-5">
              {category.children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/categories/${child.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-sm text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                  >
                    <CategoryIcon
                      name={child.icon}
                      className="size-3.5 shrink-0 text-ink-400"
                    />
                    {label(child)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/categories/${category.slug}`}
                  className="inline-flex items-center rounded-full bg-ink-100 px-3 py-1.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-200"
                >
                  {viewAllLabel}
                </Link>
              </li>
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
