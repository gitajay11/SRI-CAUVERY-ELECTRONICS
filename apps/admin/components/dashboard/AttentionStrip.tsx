import Link from 'next/link';
import { getI18n } from '@/i18n/server';
import { cn } from '@tamizh/core/utils';
import {
  AlertIcon,
  CheckIcon,
  ClipboardIcon,
  RotateLeftIcon,
  TagIcon,
  WarehouseIcon,
} from '@/components/ui/Icons';

/**
 * "What needs doing right now."
 *
 * The first thing a shop owner opens the panel to find out. Anything at zero
 * is omitted rather than shown as a reassuring zero — the strip should be
 * empty on a good morning, so a single chip actually draws the eye.
 */
export async function AttentionStrip({
  attention,
}: {
  attention: {
    pendingOrders: number;
    pendingPayments: number;
    pendingReturns: number;
    lowStock: number;
    outOfStock: number;
  };
}) {
  const { t } = await getI18n();

  const chips = [
    {
      key: 'orders',
      count: attention.pendingOrders,
      label: t('dash.pendingOrders'),
      href: '/orders?status=PENDING',
      icon: <ClipboardIcon />,
      tone: 'caution' as const,
    },
    {
      key: 'payments',
      count: attention.pendingPayments,
      label: t('dash.pendingPayments'),
      href: '/payments?status=PENDING',
      icon: <TagIcon />,
      tone: 'info' as const,
    },
    {
      key: 'returns',
      count: attention.pendingReturns,
      label: t('dash.pendingReturns'),
      href: '/returns',
      icon: <RotateLeftIcon />,
      tone: 'info' as const,
    },
    {
      key: 'outOfStock',
      count: attention.outOfStock,
      label: t('dash.outOfStock'),
      href: '/inventory?filter=out',
      icon: <AlertIcon />,
      tone: 'critical' as const,
    },
    {
      key: 'lowStock',
      count: attention.lowStock,
      label: t('dash.lowStock'),
      href: '/inventory?filter=low',
      icon: <WarehouseIcon />,
      tone: 'caution' as const,
    },
  ].filter((chip) => chip.count > 0);

  if (chips.length === 0) {
    return (
      <p className="mb-5 flex items-center gap-2 rounded-panel border border-positive-100 bg-positive-50 px-4 py-3 text-sm font-medium text-positive-600">
        <CheckIcon className="text-base" />
        {t('dash.allClear')}
      </p>
    );
  }

  const tones = {
    caution: 'border-caution-100 bg-caution-50 text-caution-600 hover:bg-caution-100',
    critical: 'border-critical-100 bg-critical-50 text-critical-600 hover:bg-critical-100',
    info: 'border-info-100 bg-info-50 text-info-600 hover:bg-info-100',
  };

  return (
    <section aria-label={t('dash.needsAttention')} className="mb-5">
      <div className="snap-rail -mx-4 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((chip) => (
          <Link
            key={chip.key}
            href={chip.href}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors',
              tones[chip.tone],
            )}
          >
            <span className="text-base">{chip.icon}</span>
            <span className="font-bold tabular-nums">{chip.count}</span>
            <span>{chip.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
