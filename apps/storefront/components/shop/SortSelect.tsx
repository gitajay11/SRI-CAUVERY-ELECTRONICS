'use client';

import type { SortKey } from '@tamizh/core/types';
import { SORT_KEYS } from '@tamizh/core/types';
import { buildHref, type SearchParamsInput } from '@/lib/product-query';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useNavigation } from '@/hooks/useNavigation';
import { Select } from '@/components/ui/Field';
import { SortIcon, SpinnerIcon } from '@/components/ui/Icons';

/**
 * Sort control — a native select, which is the best picker on mobile.
 *
 * Re-sorting is a navigation to the same page with a different query, which
 * the framework performs without a loading state: the old order stays on
 * screen until the new one arrives. The push goes through `useNavigation`
 * so the page spinner shows, and the control's own icon spins too, since
 * that is where the shopper is looking.
 */
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
  const { push, pending } = useNavigation();

  return (
    <Select
      size="sm"
      leadingIcon={pending ? <SpinnerIcon /> : <SortIcon />}
      aria-label={t('shop.sortBy')}
      aria-busy={pending || undefined}
      disabled={pending}
      value={current}
      onChange={(event) =>
        push(buildHref(basePath, params, { sort: event.target.value }), { scroll: false })
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
