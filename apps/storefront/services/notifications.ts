import 'server-only';
import type { OrderView } from '@tamizh/core/types';
import { formatINR } from '@tamizh/core/money';

/**
 * Outbound notifications (email / SMS).
 *
 * Both channels are behind this one module so that wiring a real provider is a
 * single, contained change. Until EMAIL_PROVIDER / SMS_PROVIDER are configured
 * the messages are logged, which keeps development quiet and honest: nothing
 * pretends a message was delivered when it was not.
 */

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

interface SmsMessage {
  to: string;
  text: string;
}

async function sendEmail(message: EmailMessage): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? 'console';
  if (provider === 'console') {
    console.info(`[email] to=${message.to} subject="${message.subject}"`);
    return;
  }
  // Wire an SMTP/API transport here. Deliberately left unimplemented rather
  // than half-implemented, so a misconfiguration fails loudly in review.
  console.warn(`[email] EMAIL_PROVIDER="${provider}" is not implemented; message dropped.`);
}

async function sendSms(message: SmsMessage): Promise<void> {
  const provider = process.env.SMS_PROVIDER ?? 'console';
  if (provider === 'console') {
    console.info(`[sms] to=${message.to}`);
    return;
  }
  console.warn(`[sms] SMS_PROVIDER="${provider}" is not implemented; message dropped.`);
}

function orderSummaryText(order: OrderView): string {
  const lines = order.items
    .map((item) => `  ${item.quantity} × ${item.name} — ${formatINR(item.lineTotal)}`)
    .join('\n');

  return [
    `Thank you for your order, ${order.customerName}.`,
    '',
    `Order number: ${order.orderNumber}`,
    `Payment: ${order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Paid online'}`,
    '',
    'Items',
    lines,
    '',
    `Subtotal: ${formatINR(order.subtotal)}`,
    order.discountTotal > 0 ? `Discount: -${formatINR(order.discountTotal)}` : null,
    `Delivery: ${order.shippingFee === 0 ? 'FREE' : formatINR(order.shippingFee)}`,
    `Total: ${formatINR(order.total)}`,
    '',
    'Delivering to',
    `  ${order.addressLine1}${order.addressLine2 ? `, ${order.addressLine2}` : ''}`,
    `  ${order.city}, ${order.district}, ${order.state} ${order.pincode}`,
    '',
    'Sri Cauvery Electronics — ஸ்ரீ காவேரி மின்னணுவியல்',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

/** Fire-and-forget: a notification failure must never fail an order. */
export async function sendOrderConfirmation(order: OrderView): Promise<void> {
  try {
    await sendEmail({
      to: order.customerEmail,
      subject: `Order ${order.orderNumber} confirmed — Sri Cauvery Electronics`,
      text: orderSummaryText(order),
    });
    await sendSms({
      to: order.customerPhone,
      text: `Sri Cauvery Electronics: order ${order.orderNumber} confirmed for ${formatINR(order.total)}. Track it in My Orders.`,
    });
  } catch (error) {
    console.error('[notifications] order confirmation failed', error);
  }
}

export async function sendOrderStatusUpdate(order: OrderView): Promise<void> {
  try {
    await sendSms({
      to: order.customerPhone,
      text: `Sri Cauvery Electronics: order ${order.orderNumber} is now ${order.status
        .toLowerCase()
        .replace(/_/g, ' ')}.`,
    });
  } catch (error) {
    console.error('[notifications] status update failed', error);
  }
}

export async function sendContactEnquiry(input: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<void> {
  await sendEmail({
    to: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@tamizhelectronics.in',
    subject: `Website enquiry: ${input.subject}`,
    text: [
      `From: ${input.name} <${input.email}>`,
      input.phone ? `Phone: ${input.phone}` : null,
      '',
      input.message,
    ]
      .filter((line) => line !== null)
      .join('\n'),
  });
}

/**
 * Tells the admin panel that something needs staff attention.
 *
 * The two apps share a database but run on different hosts, so Web Push lives
 * with the panel; this is the shop asking it to raise an alert.
 *
 * Best effort by design, and deliberately not awaited by the caller's critical
 * path: a checkout must never fail because a notification host was slow. The
 * order itself is already committed and visible in the panel's order list, so
 * a dropped alert costs a nudge, not a record.
 */
export async function notifyAdmin(input: {
  type: 'NEW_ORDER' | 'RETURN_REQUESTED' | 'PAYMENT_FAILED' | 'NEW_CUSTOMER';
  title: string;
  body: string;
  entityId?: string;
  url?: string;
}): Promise<void> {
  const secret = process.env.INTERNAL_NOTIFY_SECRET?.trim();
  const base = process.env.ADMIN_SITE_URL?.trim();
  if (!secret || !base) return;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${base.replace(/\/+$/, '')}/api/admin/internal/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timer);
    if (!response.ok) {
      console.warn(`[notify-admin] ${input.type} rejected with ${response.status}`);
    }
  } catch (error) {
    console.warn('[notify-admin] could not reach the admin panel', error);
  }
}
