'use client';

import { useRouter } from 'next/navigation';
import type { SortKey } from '@tamizh/core/types';
import { SORT_KEYS } from '@tamizh/core/types';
import { buildHref, type SearchParamsInput } from '@/lib/product-query';
import { useLocale } from '@/components/providers/LocaleProvider';
import { SortIcon } from '@/components/ui/Icons';

/** Sort control — a native select, which is the best picker on mobile. */
export function SortSelect({
  params,
  basePath,
  current,
}: {
  params: SearchParamsInput;
  basePath: string;
  current: SortKey;
}) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <label className="flex min-h-11 items-center gap-2 rounded-full border border-ink-200 bg-surface pl-3.5 pr-2 text-sm">
      <SortIcon className="shrink-0 text-base text-ink-400" />
      <span className="hidden text-ink-500 sm:inline">{t('shop.sortBy')}</span>
      <span className="sr-only sm:hidden">{t('shop.sortBy')}</span>
      <select
        value={current}
        onChange={(event) =>
          router.push(buildHref(basePath, params, { sort: event.target.value }), {
            scroll: false,
          })
        }
        className="cursor-pointer bg-transparent py-2 pr-1 font-semibold text-ink-900 outline-none"
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {t(`shop.sort.${key}` as `shop.sort.${SortKey}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
