import 'server-only';
import type { OrderView } from '@tamizh/core/types';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { shopConfig } from '@/lib/site';

/**
 * The two emails an order sends: the customer's confirmation and the shop's
 * copy of the order.
 *
 * Both are built as plain text first and HTML second, from the same facts,
 * so a mail client that shows only one of them still says everything. The
 * HTML is one column with inline styles and no images, which is what
 * survives the widest range of mail clients — and a receipt is read, not
 * admired.
 *
 * Everything that came from a person — name, address, product names — is
 * escaped before it reaches the HTML. An item named "<script>" is a product
 * name, not markup.
 */

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const adminUrl = () => (process.env.ADMIN_SITE_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

function paymentLine(order: OrderView): string {
  if (order.paymentMethod === 'COD') return 'Cash on delivery';
  return order.paymentStatus === 'PAID' ? 'Paid online' : 'Online payment — pending';
}

function addressLines(order: OrderView): string[] {
  return [
    order.customerName,
    `${order.addressLine1}${order.addressLine2 ? `, ${order.addressLine2}` : ''}`,
    `${order.city}, ${order.district}`,
    `${order.state} — ${order.pincode}`,
  ];
}

function totalsRows(order: OrderView): [string, string][] {
  const rows: [string, string][] = [['Subtotal', formatINR(order.subtotal)]];
  if (order.discountTotal > 0) rows.push(['Discount', `−${formatINR(order.discountTotal)}`]);
  if (order.taxTotal > 0) rows.push(['Tax', formatINR(order.taxTotal)]);
  rows.push(['Delivery', order.shippingFee === 0 ? 'FREE' : formatINR(order.shippingFee)]);
  rows.push(['Total', formatINR(order.total)]);
  return rows;
}

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

function itemsText(order: OrderView): string {
  return order.items
    .map((item) => `  ${item.quantity} × ${item.name} — ${formatINR(item.lineTotal)}`)
    .join('\n');
}

function totalsText(order: OrderView): string {
  return totalsRows(order)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

const styles = {
  body: 'margin:0;padding:24px 12px;background:#f4f2ec;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#14110c;',
  card: 'max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e1d5;border-radius:12px;overflow:hidden;',
  head: 'background:#0b0906;color:#ecd087;padding:20px 24px;',
  headName: 'margin:0;font-size:18px;font-weight:700;',
  headTa: 'margin:4px 0 0;font-size:13px;color:#cdc5b1;',
  section: 'padding:20px 24px;border-top:1px solid #efece4;',
  h1: 'margin:0 0 6px;font-size:20px;',
  muted: 'color:#635d4f;font-size:14px;line-height:1.5;margin:0;',
  table: 'width:100%;border-collapse:collapse;font-size:14px;',
  td: 'padding:8px 0;border-bottom:1px solid #efece4;vertical-align:top;',
  tdRight: 'padding:8px 0;border-bottom:1px solid #efece4;text-align:right;white-space:nowrap;',
  totalRow: 'padding:10px 0 0;font-weight:700;font-size:16px;',
  button:
    'display:inline-block;padding:12px 20px;background:#cba24a;color:#14110c;text-decoration:none;font-weight:700;border-radius:999px;',
  foot: 'padding:16px 24px;font-size:12px;color:#78715f;line-height:1.5;',
};

function itemsHtml(order: OrderView): string {
  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="${styles.td}">${escapeHtml(item.name)}<br><span style="color:#78715f">${item.quantity} × ${formatINR(item.unitPrice)}</span></td>
          <td style="${styles.tdRight}">${formatINR(item.lineTotal)}</td>
        </tr>`,
    )
    .join('');
  const totals = totalsRows(order)
    .map(([label, value], index, all) => {
      const last = index === all.length - 1;
      const cell = last ? styles.totalRow : 'padding:6px 0;color:#635d4f;';
      return `<tr><td style="${cell}">${label}</td><td style="${cell}text-align:right;">${value}</td></tr>`;
    })
    .join('');
  return `<table style="${styles.table}">${rows}${totals}</table>`;
}

function layout(title: string, sections: string[]): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="${styles.body}">
  <div style="${styles.card}">
    <div style="${styles.head}">
      <p style="${styles.headName}">${escapeHtml(shopConfig.nameEn)}</p>
      <p style="${styles.headTa}" lang="ta">${escapeHtml(shopConfig.nameTa)}</p>
    </div>
    ${sections.map((section) => `<div style="${styles.section}">${section}</div>`).join('')}
    <div style="${styles.foot}">
      ${escapeHtml(shopConfig.nameEn)} · ${escapeHtml(shopConfig.address.line1)}, ${escapeHtml(shopConfig.address.city)}<br>
      ${escapeHtml(shopConfig.supportPhone)} · ${escapeHtml(shopConfig.supportEmail)}
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// The two emails
// ---------------------------------------------------------------------------

/** To the customer: what they ordered, what they will pay, where it goes. */
export function orderConfirmationMail(order: OrderView): MailContent {
  const link = `${siteUrl()}/order/${encodeURIComponent(order.orderNumber)}`;
  const subject = `Order ${order.orderNumber} confirmed — ${shopConfig.nameEn}`;

  const text = [
    `Thank you for your order, ${order.customerName}.`,
    '',
    `Order number: ${order.orderNumber}`,
    `Placed: ${formatDate(order.placedAt, true)}`,
    `Payment: ${paymentLine(order)}`,
    '',
    'Items',
    itemsText(order),
    '',
    totalsText(order),
    '',
    'Delivering to',
    ...addressLines(order).map((line) => `  ${line}`),
    `  ${order.customerPhone}`,
    '',
    `Track your order: ${link}`,
    '',
    `Questions? Call ${shopConfig.supportPhone} or write to ${shopConfig.supportEmail}.`,
    '',
    `${shopConfig.nameEn} — ${shopConfig.nameTa}`,
  ].join('\n');

  const html = layout(subject, [
    `<h1 style="${styles.h1}">Thank you for your order, ${escapeHtml(order.customerName)}.</h1>
     <p style="${styles.muted}">Order <strong>${escapeHtml(order.orderNumber)}</strong> · ${escapeHtml(formatDate(order.placedAt, true))}<br>Payment: ${escapeHtml(paymentLine(order))}</p>`,
    itemsHtml(order),
    `<p style="${styles.muted}"><strong style="color:#14110c">Delivering to</strong><br>${addressLines(order).map(escapeHtml).join('<br>')}<br>${escapeHtml(order.customerPhone)}</p>`,
    `<a href="${escapeHtml(link)}" style="${styles.button}">Track your order</a>
     <p style="${styles.muted};margin-top:14px">Questions? Call ${escapeHtml(shopConfig.supportPhone)} or write to ${escapeHtml(shopConfig.supportEmail)}.</p>`,
  ]);

  return { subject, text, html };
}

/** To the shop: the whole order, with the customer's contact, ready to pack. */
export function orderNoticeMail(order: OrderView): MailContent {
  const link = `${adminUrl()}/orders/${encodeURIComponent(order.orderNumber)}`;
  const method = order.paymentMethod === 'COD' ? 'COD' : 'Online';
  const subject = `New order ${order.orderNumber} — ${formatINR(order.total)} (${method})`;

  const text = [
    `New order ${order.orderNumber}`,
    `Placed: ${formatDate(order.placedAt, true)}`,
    `Payment: ${paymentLine(order)}`,
    order.couponCode ? `Coupon: ${order.couponCode}` : null,
    '',
    'Customer',
    `  ${order.customerName}`,
    `  ${order.customerPhone}`,
    `  ${order.customerEmail}`,
    '',
    'Deliver to',
    ...addressLines(order).slice(1).map((line) => `  ${line}`),
    '',
    'Items',
    order.items
      .map((item) => `  ${item.quantity} × ${item.name} (${item.sku}) — ${formatINR(item.lineTotal)}`)
      .join('\n'),
    '',
    totalsText(order),
    order.notes ? `\nCustomer note: ${order.notes}` : null,
    '',
    `Open in the panel: ${link}`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = layout(subject, [
    `<h1 style="${styles.h1}">New order ${escapeHtml(order.orderNumber)}</h1>
     <p style="${styles.muted}">${escapeHtml(formatDate(order.placedAt, true))} · ${escapeHtml(paymentLine(order))}${order.couponCode ? ` · Coupon ${escapeHtml(order.couponCode)}` : ''}</p>`,
    `<p style="${styles.muted}"><strong style="color:#14110c">Customer</strong><br>${escapeHtml(order.customerName)}<br><a href="tel:${escapeHtml(order.customerPhone)}">${escapeHtml(order.customerPhone)}</a><br><a href="mailto:${escapeHtml(order.customerEmail)}">${escapeHtml(order.customerEmail)}</a></p>
     <p style="${styles.muted};margin-top:12px"><strong style="color:#14110c">Deliver to</strong><br>${addressLines(order).slice(1).map(escapeHtml).join('<br>')}</p>`,
    itemsHtml(order) +
      (order.notes
        ? `<p style="${styles.muted};margin-top:12px"><strong style="color:#14110c">Customer note</strong><br>${escapeHtml(order.notes)}</p>`
        : ''),
    `<a href="${escapeHtml(link)}" style="${styles.button}">Open in the panel</a>`,
  ]);

  return { subject, text, html };
}
