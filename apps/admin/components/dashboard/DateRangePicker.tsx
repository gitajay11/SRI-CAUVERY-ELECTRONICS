'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@tamizh/core/utils';
import { useAdmin } from '@/components/providers/AdminProviders';
import type { TranslationKey } from '@/i18n/en';
import { Button } from '@/components/ui/Button';
import { CalendarIcon } from '@/components/ui/Icons';

/**
 * Date-range control for the dashboard and reports.
 *
 * The range lives in the URL, so a view is shareable and the back button
 * behaves — an admin comparing two periods should not lose the first one.
 */

const PRESETS: { key: string; labelKey: TranslationKey }[] = [
  { key: 'today', labelKey: 'dash.today' },
  { key: 'yesterday', labelKey: 'dash.yesterday' },
  { key: 'last7', labelKey: 'dash.last7' },
  { key: 'last30', labelKey: 'dash.last30' },
  { key: 'thisMonth', labelKey: 'dash.thisMonth' },
  { key: 'previousMonth', labelKey: 'dash.previousMonth' },
];

export function DateRangePicker({
  current,
  from,
  to,
  basePath = '/',
}: {
  current: string;
  from?: string;
  to?: string;
  basePath?: string;
}) {
  const { t } = useAdmin();
  const router = useRouter();
  const [customOpen, setCustomOpen] = useState(current === 'custom');
  const [customFrom, setCustomFrom] = useState(from ?? '');
  const [customTo, setCustomTo] = useState(to ?? '');

  const go = (key: string) => {
    if (key === 'custom') {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    router.push(`${basePath}?range=${key}`);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="snap-rail -mx-4 px-4 sm:mx-0 sm:flex-wrap sm:justify-end sm:px-0">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => go(preset.key)}
            aria-pressed={current === preset.key}
            className={cn(
              'min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
              current === preset.key
                ? 'border-brand-500 bg-success-50 text-link'
                : 'border-slate-300 bg-surface text-slate-600 hover:border-slate-400',
            )}
          >
            {t(preset.labelKey)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => go('custom')}
          aria-pressed={current === 'custom'}
          className={cn(
            'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors',
            current === 'custom'
              ? 'border-brand-500 bg-success-50 text-link'
              : 'border-slate-300 bg-surface text-slate-600 hover:border-slate-400',
          )}
        >
          <CalendarIcon className="text-base" />
          {t('dash.custom')}
        </button>
      </div>

      {customOpen ? (
        <form
          className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-surface p-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!customFrom || !customTo) return;
            router.push(
              `${basePath}?range=custom&from=${customFrom}&to=${customTo}`,
            );
          }}
        >
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">{t('reports.from')}</span>
            <input
              type="date"
              value={customFrom}
              max={customTo || today}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-500"
            />
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">{t('reports.to')}</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={today}
              onChange={(event) => setCustomTo(event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-500"
            />
          </label>
          <Button type="submit" size="sm" disabled={!customFrom || !customTo}>
            {t('common.apply')}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
