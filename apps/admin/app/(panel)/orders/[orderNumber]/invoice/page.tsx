import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@tamizh/db';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getSettings } from '@/services/settings';
import { PrintButton } from '@/components/orders/PrintButton';

export const metadata = { title: 'Invoice' };

/**
 * A printable invoice.
 *
 * Laid out for A4 with the panel's chrome hidden at print time (see the print
 * rules in globals.css). The shop's own details come from settings, so a change
 * of address or GSTIN does not need a developer.
 *
 * Amounts are taken from what was recorded on the order, never recomputed:
 * an invoice has to keep saying what was actually charged, even if a price has
 * moved since.
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await requirePermission('orders.view');
  const { t } = await getI18n();
  const { orderNumber } = await params;

  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { orderNumber: decodeURIComponent(orderNumber) },
      include: { items: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    getSettings(),
  ]);

  if (!order) notFound();

  const taxable = order.subtotal - order.discountTotal;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/orders/${order.orderNumber}`}
          className="text-sm text-slate-500 hover:text-brand-700"
        >
          ← {t('orders.title')}
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[820px] rounded-panel border border-slate-200 bg-surface p-6 shadow-panel print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{settings.nameEn}</h1>
            <p lang="ta" className="font-tamil text-sm text-slate-600">
              {settings.nameTa}
            </p>
            <address className="mt-2 text-xs not-italic leading-relaxed text-slate-500">
              {settings.addressLine1}
              {settings.addressLine2 ? `, ${settings.addressLine2}` : ''}
              <br />
              {settings.city}, {settings.district}, {settings.state} {settings.pincode}
              <br />
              {settings.phone} · {settings.email}
              {settings.gstin ? (
                <>
                  <br />
                  GSTIN: <span className="font-mono">{settings.gstin}</span>
                </>
              ) : null}
            </address>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('invoice.title')}
            </p>
            <p className="font-mono text-lg font-bold text-slate-900">{order.orderNumber}</p>
            <p className="text-xs text-slate-500">{formatDate(order.placedAt, true)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {t('common.status')}: {order.status}
            </p>
          </div>
        </header>

        <section className="grid gap-4 border-b border-slate-200 py-5 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('invoice.billTo')}
            </h2>
            <p className="mt-1 font-medium text-slate-900">{order.customerName}</p>
            <address className="text-sm not-italic leading-relaxed text-slate-600">
              {order.addressLine1}
              {order.addressLine2 ? (
                <>
                  <br />
                  {order.addressLine2}
                </>
              ) : null}
              <br />
              {order.city}, {order.district}
              <br />
              {order.state} {order.pincode}
              <br />
              {order.customerPhone}
            </address>
          </div>

          <div className="sm:text-right">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('invoice.payment')}
            </h2>
            <p className="mt-1 text-sm text-slate-700">{order.paymentMethod}</p>
            <p className="text-sm text-slate-700">{order.paymentStatus}</p>
            {order.payments[0]?.providerPaymentId ? (
              <p className="font-mono text-xs text-slate-500">
                {order.payments[0].providerPaymentId}
              </p>
            ) : null}
            {order.couponCode ? (
              <p className="mt-1 text-xs text-slate-500">
                {t('orders.discount')}: <span className="font-mono">{order.couponCode}</span>
              </p>
            ) : null}
          </div>
        </section>

        <table className="w-full py-4 text-sm">
          <caption className="sr-only">{t('orders.items')}</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-2 font-semibold">
                {t('common.name')}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                {t('common.quantity')}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                {t('common.price')}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                {t('common.total')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2">
                  <span className="block font-medium text-slate-900">{item.name}</span>
                  <span className="block font-mono text-xs text-slate-500">{item.sku}</span>
                </td>
                <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2 text-right tabular-nums">{formatINR(item.unitPrice)}</td>
                <td className="py-2 text-right font-semibold tabular-nums">
                  {formatINR(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="ms-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('orders.subtotal')}</span>
            <span className="tabular-nums">{formatINR(order.subtotal)}</span>
          </div>
          {order.discountTotal > 0 ? (
            <div className="flex justify-between text-positive-600">
              <span>{t('orders.discount')}</span>
              <span className="tabular-nums">−{formatINR(order.discountTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-slate-500">{t('orders.delivery')}</span>
            <span className="tabular-nums">
              {order.shippingFee === 0 ? t('invoice.free') : formatINR(order.shippingFee)}
            </span>
          </div>
          {order.taxTotal > 0 ? (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('orders.tax')}</span>
              <span className="tabular-nums">{formatINR(order.taxTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-slate-900">
            <span>{t('orders.grandTotal')}</span>
            <span className="tabular-nums">{formatINR(order.total)}</span>
          </div>
        </section>

        <footer className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>
            {settings.pricesIncludeTax
              ? t('invoice.taxIncluded')
              : t('invoice.taxExcluded', { amount: formatINR(taxable) })}
          </p>
          <p className="mt-1">{t('invoice.thanks', { shop: settings.nameEn })}</p>
        </footer>
      </article>
    </>
  );
}
