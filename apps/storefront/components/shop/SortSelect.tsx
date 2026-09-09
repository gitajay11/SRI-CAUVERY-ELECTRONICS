'use client';

import { useRouter } from 'next/navigation';
import type { SortKey } from '@tamizh/core/types';
import { SORT_KEYS } from '@tamizh/core/types';
import { buildHref, type SearchParamsInput } from '@/lib/product-query';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Select } from '@/components/ui/Field';
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
    <Select
      size="sm"
      leadingIcon={<SortIcon />}
      aria-label={t('shop.sortBy')}
      value={current}
      onChange={(event) =>
        router.push(buildHref(basePath, params, { sort: event.target.value }), {
          scroll: false,
        })
      }
    >
      {SORT_KEYS.map((key) => (
        <option key={key} value={key}>
          {t(`shop.sort.${key}` as `shop.sort.${SortKey}`)}
        </option>
      ))}
    </Select>
  );
}
