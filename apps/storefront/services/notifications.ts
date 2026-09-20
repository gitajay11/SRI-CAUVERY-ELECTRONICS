import 'server-only';
import type { OrderView } from '@tamizh/core/types';
import { formatINR } from '@tamizh/core/money';
import { shopConfig } from '@/lib/site';
import { sendEmail } from './email-transport';
import { orderConfirmationMail, orderNoticeMail } from './order-mail';

/**
 * Outbound notifications (email / SMS).
 *
 * Both channels are behind this one module so that wiring a real provider is a
 * single, contained change: email goes out through email-transport.ts, SMS is
 * still logged until SMS_PROVIDER is wired. Nothing here pretends a message
 * was delivered when it was not.
 */

interface SmsMessage {
  to: string;
  text: string;
}

async function sendSms(message: SmsMessage): Promise<void> {
  const provider = process.env.SMS_PROVIDER ?? 'console';
  if (provider === 'console') {
    console.info(`[sms] to=${message.to}`);
    return;
  }
  console.warn(`[sms] SMS_PROVIDER="${provider}" is not implemented; message dropped.`);
}

/**
 * The customer's confirmation: email, then SMS. Never fails an order — the
 * order is already committed by the time this runs, and a mail server being
 * down is the shop's problem to notice, not the customer's to be blocked by.
 */
export async function sendOrderConfirmation(order: OrderView): Promise<void> {
  try {
    const mail = orderConfirmationMail(order);
    await sendEmail({
      to: order.customerEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: shopConfig.supportEmail,
    });
  } catch (error) {
    console.error(`[notifications] confirmation email for ${order.orderNumber} failed`, error);
  }
  try {
    await sendSms({
      to: order.customerPhone,
      text: `Sri Cauvery Electronics: order ${order.orderNumber} confirmed for ${formatINR(order.total)}. Track it in My Orders.`,
    });
  } catch (error) {
    console.error(`[notifications] confirmation SMS for ${order.orderNumber} failed`, error);
  }
}

/**
 * The shop's copy of the order, to ORDER_NOTIFY_EMAIL — the mailbox whoever
 * packs the orders reads. Falls back to the support address, which is the
 * shop's own; without either, nothing is sent and nothing is pretended.
 *
 * Replies go to the customer, so "is the blue one in stock?" is one click.
 */
export async function sendOrderToShop(order: OrderView): Promise<void> {
  const to = process.env.ORDER_NOTIFY_EMAIL?.trim() || shopConfig.supportEmail;
  if (!to) return;
  try {
    const mail = orderNoticeMail(order);
    await sendEmail({
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: order.customerEmail,
    });
  } catch (error) {
    console.error(`[notifications] shop email for ${order.orderNumber} failed`, error);
  }
}

/**
 * Both order emails, once the order is a fact: for cash on delivery that is
 * the moment it is placed; for an online payment it is the moment the
 * payment is confirmed. Sent one after the other, and each on its own —
 * the shop's copy must still go out if the customer's address bounces.
 */
export async function sendOrderEmails(order: OrderView): Promise<void> {
  await sendOrderConfirmation(order);
  await sendOrderToShop(order);
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
    to: shopConfig.supportEmail,
    subject: `Website enquiry: ${input.subject}`,
    replyTo: input.email,
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
  type:
    | 'NEW_ORDER'
    | 'RETURN_REQUESTED'
    | 'CANCELLATION_REQUESTED'
    | 'PAYMENT_FAILED'
    | 'NEW_CUSTOMER';
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
