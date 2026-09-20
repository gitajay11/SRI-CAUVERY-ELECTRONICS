import 'server-only';
import type { OrderItemView, OrderView } from '@tamizh/core/types';
import { formatINR } from '@tamizh/core/money';
import { formatDate } from '@tamizh/core/utils';
import { shopConfig, formattedAddress } from '@/lib/site';

/**
 * The two emails an order sends: the customer's confirmation and the shop's
 * copy of the order.
 *
 * Both are built as plain text first and HTML second, from the same facts,
 * so a mail client that shows only one of them still says everything.
 *
 * The HTML is laid out with tables and inline styles, which is not
 * nostalgia: it is what Gmail, Outlook and the phone clients actually
 * render the same way. Nothing runs in an email, so "interactive" means
 * every fact that can be acted on is a link — the order, each product, the
 * customer's phone and WhatsApp, the delivery address on a map — and the
 * one thing the reader most wants to do next is a button they cannot miss.
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

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const adminUrl = () =>
  (process.env.ADMIN_SITE_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

/** Product images may be stored as site-relative paths; mail needs absolute. */
function absolute(url: string): string {
  return url.startsWith('/') ? `${siteUrl()}${url}` : url;
}

function paid(order: OrderView): boolean {
  return order.paymentStatus === 'PAID';
}

function paymentLine(order: OrderView): string {
  if (order.paymentMethod === 'COD') return `Cash on delivery — pay ${formatINR(order.total)} when it arrives`;
  return paid(order) ? `Paid online — ${formatINR(order.total)} received` : 'Online payment — pending';
}

function addressLines(order: OrderView): string[] {
  return [
    `${order.addressLine1}${order.addressLine2 ? `, ${order.addressLine2}` : ''}`,
    `${order.city}, ${order.district}`,
    `${order.state} — ${order.pincode}`,
  ];
}

function mapsLink(order: OrderView): string {
  const query = [order.addressLine1, order.addressLine2, order.city, order.district, order.state, order.pincode]
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** wa.me wants the country code and digits only. */
function whatsappTo(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

function totalsRows(order: OrderView): [string, string][] {
  const rows: [string, string][] = [['Subtotal', formatINR(order.subtotal)]];
  if (order.discountTotal > 0) rows.push(['Discount', `−${formatINR(order.discountTotal)}`]);
  if (order.taxTotal > 0) rows.push(['Tax', formatINR(order.taxTotal)]);
  rows.push(['Delivery', order.shippingFee === 0 ? 'FREE' : formatINR(order.shippingFee)]);
  return rows;
}

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

function itemsText(order: OrderView, withSku = false): string {
  return order.items
    .map(
      (item) =>
        `  ${item.quantity} × ${item.name}${withSku ? ` (${item.sku})` : ''} — ${formatINR(item.lineTotal)}`,
    )
    .join('\n');
}

function totalsText(order: OrderView): string {
  return [...totalsRows(order), ['Total', formatINR(order.total)] as [string, string]]
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// HTML building blocks
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The palette, as hex: mail clients do not read CSS variables. */
const c = {
  carbon: '#0b0906',
  carbonSoft: '#1f1c17',
  gold: '#cba24a',
  goldSoft: '#ecd087',
  goldTint: '#fdf6e3',
  paper: '#f4f2ec',
  surface: '#ffffff',
  ink: '#14110c',
  muted: '#635d4f',
  faint: '#948b79',
  line: '#e6e1d5',
  lineSoft: '#efece4',
  green: '#2e7d4f',
  greenTint: '#e8f4ec',
};

const font = "font-family:'Segoe UI',Helvetica,Arial,sans-serif;";

/** A table that only lays out; screen readers skip it. */
const table = (attrs: string, inner: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${attrs}>${inner}</table>`;

function pill(text: string, tone: 'gold' | 'green' | 'grey' = 'gold'): string {
  const bg = tone === 'green' ? c.greenTint : tone === 'grey' ? c.lineSoft : c.goldTint;
  const fg = tone === 'green' ? c.green : tone === 'grey' ? c.muted : '#7a5a10';
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:700;letter-spacing:0.02em;${font}">${text}</span>`;
}

/** A button every client draws as a button: a table cell, not a styled link. */
function button(label: string, href: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bg = variant === 'primary' ? c.gold : c.surface;
  const fg = variant === 'primary' ? c.ink : c.ink;
  const border = variant === 'primary' ? c.gold : c.line;
  return table(
    'style="display:inline-table;margin:0 8px 8px 0;"',
    `<tr><td style="border-radius:999px;background:${bg};border:1px solid ${border};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;border-radius:999px;color:${fg};text-decoration:none;font-size:14px;font-weight:700;${font}">${label}</a>
    </td></tr>`,
  );
}

function card(title: string | null, inner: string, options: { tint?: boolean } = {}): string {
  return table(
    `width="100%" style="margin-top:14px;background:${options.tint ? c.goldTint : c.surface};border:1px solid ${c.line};border-radius:14px;"`,
    `<tr><td style="padding:18px 20px;">
      ${title ? `<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${c.faint};${font}">${title}</p>` : ''}
      ${inner}
    </td></tr>`,
  );
}

function header(eyebrow: string | null = null): string {
  const crest = `${siteUrl()}/icons/icon-192.png`;
  return table(
    `width="100%" style="background:${c.carbon};border-radius:16px 16px 0 0;"`,
    `<tr>
      <td style="padding:20px 22px;" width="56">
        <img src="${escapeHtml(crest)}" width="48" height="48" alt="" style="display:block;width:48px;height:48px;border-radius:12px;background:#000;">
      </td>
      <td style="padding:20px 22px 20px 0;vertical-align:middle;">
        <p style="margin:0;font-size:17px;font-weight:800;color:${c.goldSoft};${font}">${escapeHtml(shopConfig.nameEn)}</p>
        <p lang="ta" style="margin:3px 0 0;font-size:13px;color:#b3ab97;${font}">${escapeHtml(shopConfig.nameTa)}</p>
      </td>
      ${eyebrow ? `<td align="right" style="padding:20px 22px 20px 0;vertical-align:middle;white-space:nowrap;">${pill(eyebrow, 'gold')}</td>` : ''}
    </tr>`,
  );
}

function footer(note: string): string {
  return `<p style="margin:22px 8px 0;font-size:12px;line-height:1.6;color:${c.faint};text-align:center;${font}">
    ${note}<br>
    ${escapeHtml(shopConfig.nameEn)} · ${escapeHtml(formattedAddress())}<br>
    <a href="tel:${escapeHtml(shopConfig.supportPhone.replace(/\s/g, ''))}" style="color:${c.muted};text-decoration:none;">${escapeHtml(shopConfig.supportPhone)}</a>
    · <a href="mailto:${escapeHtml(shopConfig.supportEmail)}" style="color:${c.muted};text-decoration:none;">${escapeHtml(shopConfig.supportEmail)}</a>
  </p>`;
}

function layout(title: string, preheader: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${c.paper};">
  <!-- The line mail clients show after the subject, before the mail is opened. -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${c.paper};">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  ${table(
    `width="100%" style="background:${c.paper};"`,
    `<tr><td align="center" style="padding:24px 12px;">
      ${table(
        `width="100%" style="max-width:600px;"`,
        `<tr><td>
          ${body}
        </td></tr>`,
      )}
    </td></tr>`,
  )}
</body>
</html>`;
}

/**
 * The order's journey as a row of steps, the ones already passed in gold.
 * Four cells of equal width, which every client can manage.
 */
function steps(labels: string[], reached: number): string {
  const cells = labels
    .map((label, index) => {
      const done = index <= reached;
      const current = index === reached;
      return `<td align="center" valign="top" width="${Math.floor(100 / labels.length)}%" style="padding:0 2px;">
        <div style="margin:0 auto;width:26px;height:26px;line-height:26px;border-radius:13px;text-align:center;font-size:13px;font-weight:800;${font}background:${done ? c.gold : c.lineSoft};color:${done ? c.ink : c.faint};${current ? `box-shadow:0 0 0 4px ${c.goldTint};` : ''}">${done ? '&#10003;' : index + 1}</div>
        <p style="margin:8px 0 0;font-size:11px;line-height:1.3;font-weight:${done ? 700 : 500};color:${done ? c.ink : c.faint};${font}">${label}</p>
      </td>`;
    })
    .join('');
  return table('width="100%" style="margin:6px 0 2px;"', `<tr>${cells}</tr>`);
}

function itemRow(item: OrderItemView, options: { link: boolean; sku: boolean }): string {
  const name = escapeHtml(item.name);
  const href = item.slug ? `${siteUrl()}/product/${encodeURIComponent(item.slug)}` : null;
  const title =
    options.link && href
      ? `<a href="${escapeHtml(href)}" style="color:${c.ink};text-decoration:none;font-weight:700;">${name}</a>`
      : `<span style="font-weight:700;color:${c.ink};">${name}</span>`;
  const thumb = item.imageUrl
    ? `<img src="${escapeHtml(absolute(item.imageUrl))}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:10px;object-fit:cover;background:${c.lineSoft};">`
    : `<div style="width:56px;height:56px;border-radius:10px;background:${c.lineSoft};"></div>`;
  return `<tr>
    <td width="56" style="padding:10px 12px 10px 0;border-bottom:1px solid ${c.lineSoft};vertical-align:top;">${thumb}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${c.lineSoft};vertical-align:top;font-size:14px;line-height:1.45;${font}">
      ${title}<br>
      <span style="color:${c.muted};font-size:13px;">${item.quantity} × ${formatINR(item.unitPrice)}${options.sku ? ` · <span style="font-family:Consolas,Menlo,monospace;">${escapeHtml(item.sku)}</span>` : ''}</span>
    </td>
    <td align="right" style="padding:10px 0 10px 12px;border-bottom:1px solid ${c.lineSoft};vertical-align:top;white-space:nowrap;font-size:14px;font-weight:700;color:${c.ink};${font}">${formatINR(item.lineTotal)}</td>
  </tr>`;
}

function itemsBlock(order: OrderView, options: { link: boolean; sku: boolean }): string {
  const rows = order.items.map((item) => itemRow(item, options)).join('');
  const totals = totalsRows(order)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:5px 0;font-size:13px;color:${c.muted};${font}">${label}</td><td align="right" style="padding:5px 0;font-size:13px;color:${c.muted};${font}">${value}</td></tr>`,
    )
    .join('');
  return table(
    'width="100%"',
    `${rows}
    <tr><td colspan="3" style="padding-top:10px;">
      ${table(
        'width="100%"',
        `${totals}
        <tr><td style="padding:10px 0 0;font-size:17px;font-weight:800;color:${c.ink};${font}">Total</td><td align="right" style="padding:10px 0 0;font-size:17px;font-weight:800;color:${c.ink};${font}">${formatINR(order.total)}</td></tr>`,
      )}
    </td></tr>`,
  );
}

const p = (html: string, extra = '') =>
  `<p style="margin:0;font-size:14px;line-height:1.55;color:${c.ink};${font}${extra}">${html}</p>`;

// ---------------------------------------------------------------------------
// To the customer
// ---------------------------------------------------------------------------

export function orderConfirmationMail(order: OrderView): MailContent {
  const link = `${siteUrl()}/order/${encodeURIComponent(order.orderNumber)}`;
  const subject = `Order ${order.orderNumber} confirmed — ${shopConfig.nameEn}`;
  const firstName = order.customerName.trim().split(/\s+/)[0] || order.customerName;
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);

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
    `  ${order.customerName}`,
    ...addressLines(order).map((line) => `  ${line}`),
    `  ${order.customerPhone}`,
    '',
    `Track your order: ${link}`,
    `WhatsApp us: ${whatsappTo(shopConfig.whatsapp)}`,
    '',
    `Questions? Reply to this email or call ${shopConfig.supportPhone}.`,
    '',
    `${shopConfig.nameEn} — ${shopConfig.nameTa}`,
  ].join('\n');

  const hero = table(
    `width="100%" style="background:${c.surface};border:1px solid ${c.line};border-top:0;border-radius:0 0 16px 16px;"`,
    `<tr><td align="center" style="padding:30px 22px 26px;">
      <div style="margin:0 auto;width:56px;height:56px;line-height:56px;border-radius:28px;background:${c.gold};color:${c.ink};font-size:28px;font-weight:800;text-align:center;${font}">&#10003;</div>
      <h1 style="margin:18px 0 6px;font-size:24px;line-height:1.25;font-weight:800;color:${c.ink};${font}">Thank you, ${escapeHtml(firstName)}!</h1>
      ${p('Your order is confirmed and we are getting it ready.', `color:${c.muted};`)}
      <div style="margin:16px 0 0;">${pill(`Order ${escapeHtml(order.orderNumber)}`, 'gold')} &nbsp; ${pill(escapeHtml(formatDate(order.placedAt, true)), 'grey')}</div>
      <div style="margin:22px 0 0;">${steps(['Order placed', 'Confirmed', 'Shipped', 'Delivered'], 0)}</div>
    </td></tr>`,
  );

  const payment =
    order.paymentMethod === 'COD'
      ? `${pill('Cash on delivery', 'grey')}<div style="height:8px;"></div>${p(`Keep <strong>${formatINR(order.total)}</strong> ready for the delivery agent. No advance was taken.`)}`
      : paid(order)
        ? `${pill('&#10003; Paid online', 'green')}<div style="height:8px;"></div>${p(`<strong>${formatINR(order.total)}</strong> received. Nothing more to pay.`)}`
        : `${pill('Payment pending', 'grey')}<div style="height:8px;"></div>${p('We will confirm as soon as your payment goes through.')}`;

  const body = [
    header(),
    hero,
    card(`What you ordered · ${count} ${count === 1 ? 'item' : 'items'}`, itemsBlock(order, { link: true, sku: false })),
    card(
      'Delivering to',
      p(
        `<strong>${escapeHtml(order.customerName)}</strong><br>${addressLines(order).map(escapeHtml).join('<br>')}<br><a href="tel:+91${escapeHtml(order.customerPhone.replace(/\D/g, '').slice(-10))}" style="color:${c.muted};text-decoration:none;">${escapeHtml(order.customerPhone)}</a>`,
      ),
    ),
    card('Payment', payment),
    `<div style="margin:20px 0 0;text-align:center;">
      ${button('Track your order', link, 'primary')}
      ${button('WhatsApp us', whatsappTo(shopConfig.whatsapp) + `?text=${encodeURIComponent(`Hi, about my order ${order.orderNumber}`)}`, 'secondary')}
      ${button('Call the shop', `tel:${shopConfig.supportPhone.replace(/\s/g, '')}`, 'secondary')}
    </div>`,
    `<p style="margin:14px 8px 0;font-size:13px;line-height:1.6;color:${c.muted};text-align:center;${font}">Questions about this order? Just reply to this email.<br>${escapeHtml(shopConfig.hoursEn)}</p>`,
    footer('You are receiving this because you placed an order with us.'),
  ].join('');

  return {
    subject,
    text,
    html: layout(subject, `${order.orderNumber} · ${formatINR(order.total)} · ${paymentLine(order)}`, body),
  };
}

// ---------------------------------------------------------------------------
// To the shop
// ---------------------------------------------------------------------------

export function orderNoticeMail(order: OrderView): MailContent {
  const link = `${adminUrl()}/orders/${encodeURIComponent(order.orderNumber)}`;
  const method = order.paymentMethod === 'COD' ? 'COD' : paid(order) ? 'Paid' : 'Online';
  const subject = `New order ${order.orderNumber} — ${formatINR(order.total)} (${method})`;
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const phoneDigits = order.customerPhone.replace(/\D/g, '').slice(-10);

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
    ...addressLines(order).map((line) => `  ${line}`),
    `  Map: ${mapsLink(order)}`,
    '',
    'Items',
    itemsText(order, true),
    '',
    totalsText(order),
    order.notes ? `\nCustomer note: ${order.notes}` : null,
    '',
    `Open in the panel: ${link}`,
    `WhatsApp the customer: ${whatsappTo(order.customerPhone)}`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const banner = table(
    `width="100%" style="background:${c.carbonSoft};border-radius:0 0 16px 16px;"`,
    `<tr>
      <td style="padding:22px 22px 24px;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#b3ab97;${font}">New order · ${escapeHtml(formatDate(order.placedAt, true))}</p>
        <p style="margin:8px 0 0;font-size:30px;line-height:1.1;font-weight:800;color:${c.goldSoft};${font}">${formatINR(order.total)}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#e2dbc9;${font}"><span style="font-family:Consolas,Menlo,monospace;font-weight:700;">${escapeHtml(order.orderNumber)}</span> · ${count} ${count === 1 ? 'item' : 'items'}</p>
      </td>
      <td align="right" valign="top" style="padding:22px 22px 0 0;white-space:nowrap;">
        ${order.paymentMethod === 'COD' ? pill('Cash on delivery', 'gold') : paid(order) ? pill('&#10003; Paid online', 'green') : pill('Payment pending', 'grey')}
      </td>
    </tr>`,
  );

  const actions = `<div style="margin:18px 0 4px;">
    ${button('Open in the panel', link, 'primary')}
    ${button('Call customer', `tel:+91${escapeHtml(phoneDigits)}`, 'secondary')}
    ${button('WhatsApp', whatsappTo(order.customerPhone), 'secondary')}
    ${button('Email', `mailto:${escapeHtml(order.customerEmail)}?subject=${encodeURIComponent(`Your order ${order.orderNumber}`)}`, 'secondary')}
  </div>`;

  const customer = p(
    `<strong style="font-size:15px;">${escapeHtml(order.customerName)}</strong><br>
     <a href="tel:+91${escapeHtml(phoneDigits)}" style="color:${c.ink};text-decoration:none;">${escapeHtml(order.customerPhone)}</a><br>
     <a href="mailto:${escapeHtml(order.customerEmail)}" style="color:${c.muted};text-decoration:none;">${escapeHtml(order.customerEmail)}</a>`,
  );

  const deliverTo = `${p(addressLines(order).map(escapeHtml).join('<br>'))}
    <p style="margin:10px 0 0;font-size:13px;${font}"><a href="${escapeHtml(mapsLink(order))}" style="color:#7a5a10;font-weight:700;text-decoration:none;">Open in Google Maps &rarr;</a></p>`;

  const note = order.notes
    ? card('Customer note', p(`&ldquo;${escapeHtml(order.notes)}&rdquo;`, 'font-style:italic;'), { tint: true })
    : '';

  const meta = `<p style="margin:14px 8px 0;font-size:12px;line-height:1.6;color:${c.faint};text-align:center;${font}">${escapeHtml(paymentLine(order))}${order.couponCode ? ` · Coupon <strong>${escapeHtml(order.couponCode)}</strong>` : ''}</p>`;

  const body = [
    header(),
    banner,
    actions,
    card('Customer', customer),
    note,
    card('Deliver to', deliverTo),
    card('Items', itemsBlock(order, { link: false, sku: true })),
    meta,
    footer('An automatic notice from the shop website. Reply to write to the customer.'),
  ].join('');

  return {
    subject,
    text,
    html: layout(
      subject,
      `${order.customerName} · ${count} ${count === 1 ? 'item' : 'items'} · ${order.city} · ${paymentLine(order)}`,
      body,
    ),
  };
}
