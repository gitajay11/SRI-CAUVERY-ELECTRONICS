'use client';

import { useState } from 'react';
import { useAdmin } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { DownloadIcon } from '@/components/ui/Icons';

/**
 * CSV downloads.
 *
 * The browser is sent straight to the export endpoint rather than fetching the
 * file into memory first: a year of orders should stream to disk, not sit in a
 * blob. The date range travels with the link, so what is downloaded matches
 * what is on screen.
 */
export function ExportMenu({
  range,
  from,
  to,
}: {
  range: string;
  from?: string;
  to?: string;
}) {
  const { t, online } = useAdmin();
  const [open, setOpen] = useState(false);

  const href = (report: string) => {
    const params = new URLSearchParams({ report, range });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return `/api/admin/reports/export?${params.toString()}`;
  };

  const reports: [string, string][] = [
    ['orders', t('reports.exportOrders')],
    ['sales', t('reports.exportSales')],
    ['products', t('reports.exportProducts')],
    ['inventory', t('reports.exportInventory')],
  ];

  return (
    <div className="relative">
      <Button
        variant="outline"
        disabled={!online}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <DownloadIcon className="text-[1.1em]" />
        {t('reports.export')}
      </Button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute end-0 z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-surface p-1.5 shadow-overlay"
          >
            {reports.map(([key, label]) => (
              <a
                key={key}
                role="menuitem"
                href={href(key)}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                {label}
              </a>
            ))}
            <p className="px-3 py-2 text-xs text-slate-400">{t('reports.exportPrivacy')}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
