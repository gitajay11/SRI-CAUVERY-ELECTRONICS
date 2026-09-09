import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@tamizh/db';
import { formatDate } from '@tamizh/core/utils';
import { formatINR } from '@tamizh/core/money';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listStockHistory, reconcile } from '@/services/inventory';
import {
  PageHeader,
  Panel,
  Badge,
  Alert,
  EmptyState,
  DescriptionList,
  DescriptionRow,
} from '@/components/ui/Primitives';
import { Thumb } from '@/components/ui/Thumb';
import { StockAdjuster } from '@/components/inventory/StockAdjuster';
import { HistoryIcon } from '@/components/ui/Icons';

export const metadata = { title: 'Stock' };

export default async function InventoryDetailPage({
  params,
}: {
  searchParams?: Promise<Record<string, string>>;
  params: Promise<{ id: string }>;
}) {
  const identity = await requirePermission('inventory.view');
  const { t, dict } = await getI18n();
  const { id } = await params;

  const product = await db.product.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      nameTa: true,
      sku: true,
      stock: true,
      reservedStock: true,
      incomingStock: true,
      lowStockThreshold: true,
      price: true,
      costPrice: true,
      status: true,
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
    },
  });
  if (!product) notFound();

  const canAdjust = identity.permissions.has('inventory.adjust');
  const canSeeHistory = identity.permissions.has('inventory.history');

  const [history, balance] = await Promise.all([
    canSeeHistory ? listStockHistory(product.id) : Promise.resolve([]),
    reconcile(product.id),
  ]);

  const available = product.stock - product.reservedStock;

  return (
    <>
      <PageHeader
        title={product.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono">{product.sku}</span>
            <span aria-hidden="true">·</span>
            <span>{product.category.name}</span>
          </span>
        }
        breadcrumb={
          <Link href="/inventory" className="text-sm text-slate-500 hover:text-link">
            ← {t('inventory.title')}
          </Link>
        }
        action={
          <Badge
            tone={
              product.stock <= 0
                ? 'critical'
                : product.stock <= product.lowStockThreshold
                  ? 'caution'
                  : 'positive'
            }
          >
            {product.stock} {t('inventory.onHand')}
          </Badge>
        }
      />

      {!balance.balanced ? (
        <Alert tone="critical" className="mb-4" title={t('error.title')}>
          {t('inventory.ledgerMismatch', { ledger: balance.ledger, actual: balance.actual })}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Panel>
            <div className="flex items-start gap-4">
              <Thumb url={product.images[0]?.url} size={72} rounded="lg" />
              <div className="min-w-0 flex-1">
                <p lang="ta" className="font-tamil text-sm text-slate-600">
                  {product.nameTa}
                </p>
                <DescriptionList>
                  <DescriptionRow label={t('inventory.onHand')}>
                    <span className="tabular-nums">{product.stock}</span>
                  </DescriptionRow>
                  <DescriptionRow label={t('inventory.reserved')}>
                    <span className="tabular-nums">{product.reservedStock}</span>
                  </DescriptionRow>
                  <DescriptionRow label={t('inventory.available')}>
                    <span
                      className={`tabular-nums font-semibold ${
                        available <= 0 ? 'text-critical-600' : 'text-slate-900'
                      }`}
                    >
                      {available}
                    </span>
                  </DescriptionRow>
                  <DescriptionRow label={t('inventory.incoming')}>
                    <span className="tabular-nums">{product.incomingStock}</span>
                  </DescriptionRow>
                  <DescriptionRow label={t('inventory.threshold')}>
                    <span className="tabular-nums">{product.lowStockThreshold}</span>
                  </DescriptionRow>
                  <DescriptionRow label={t('products.costPrice')}>
                    {formatINR(product.costPrice * product.stock)}
                  </DescriptionRow>
                </DescriptionList>
                <Link
                  href={`/products/${product.id}`}
                  className="mt-2 inline-block text-sm font-medium text-link hover:underline"
                >
                  {t('products.edit')} →
                </Link>
              </div>
            </div>
          </Panel>

          {canSeeHistory ? (
            <Panel
              title={t('inventory.history')}
              description={t('inventory.movementsFor', { name: product.name })}
              padded={false}
            >
              {history.length === 0 ? (
                <EmptyState icon={<HistoryIcon />} title={t('inventory.noHistory')} />
              ) : (
                <ol className="divide-y divide-slate-100">
                  {history.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                      <span
                        className={`mt-0.5 min-w-12 shrink-0 text-right font-mono text-sm font-semibold tabular-nums ${
                          entry.change > 0 ? 'text-positive-600' : 'text-critical-600'
                        }`}
                      >
                        {entry.change > 0 ? '+' : ''}
                        {entry.change}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900">
                          {dict[`inventory.reason.${entry.reason}` as 'inventory.reason.SALE']}
                          <span className="ml-2 font-normal text-slate-400 tabular-nums">
                            {entry.quantityBefore} → {entry.quantityAfter}
                          </span>
                        </span>
                        {entry.note ? (
                          <span className="block text-sm text-slate-600">{entry.note}</span>
                        ) : null}
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {formatDate(entry.createdAt, true)}
                          <span className="mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          {t('inventory.movedBy')} {entry.actor ?? t('inventory.system')}
                          {entry.orderNumber ? (
                            <>
                              <span className="mx-1.5" aria-hidden="true">
                                ·
                              </span>
                              <Link
                                href={`/orders/${entry.orderNumber}`}
                                className="font-mono hover:text-link hover:underline"
                              >
                                {entry.orderNumber}
                              </Link>
                            </>
                          ) : null}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-20">
          {canAdjust ? (
            <Panel title={t('inventory.adjust')}>
              <StockAdjuster
                productId={product.id}
                productName={product.name}
                currentStock={product.stock}
                compact
              />
            </Panel>
          ) : (
            <Panel>
              <p className="text-sm text-slate-500">{t('auth.forbidden')}</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
