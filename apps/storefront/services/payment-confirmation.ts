import 'server-only';
import { getPrisma } from '@tamizh/db';
import { AppError } from '@tamizh/core/api';
import { after } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { onlineProvider, verifyRazorpayWebhook } from '@/services/payments';
import { getRepository } from '@/services/repository';
import { sendOrderEmails } from '@/services/notifications';

/**
 * Confirming an online payment.
 *
 * Razorpay Checkout hands the browser three strings and the browser passes
 * them here. None of them are trustworthy on their own — a shopper can post
 * whatever they like to this endpoint — so the only thing that makes a
 * payment real is that the signature agrees with a secret the browser has
 * never seen.
 *
 * The amount is never taken from the request either. It was fixed when the
 * order was placed, from the server's own cart, and this only ever confirms
 * that already-recorded figure.
 *
 * The browser is not the only messenger. A shopper whose phone dies, or who
 * closes the tab the moment the bank says yes, never posts the handshake at
 * all — so Razorpay's webhook confirms the same payment from its side, and
 * both paths end in `settlePayment`, which only one of them can win.
 */

export interface ConfirmationInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface ConfirmationResult {
  orderNumber: string;
  paymentStatus: 'PAID';
}

interface PaymentToSettle {
  id: string;
  order: { id: string; orderNumber: string; userId: string | null };
}

/**
 * Marks a payment and its order paid, once.
 *
 * The status check and the write are one statement, so the browser handshake
 * and the webhook arriving together cannot both get through — whichever lands
 * second matches nothing and returns false. Only the winner sends the
 * customer's confirmation and the shop's copy, so neither goes out twice.
 *
 * A payment recorded as FAILED can still become PAID: a dismissed modal posts
 * a failure, and the gateway may yet capture a retry on the same order.
 */
async function settlePayment(
  payment: PaymentToSettle,
  razorpayPaymentId: string,
  gatewayOrderId: string,
  via: 'checkout' | 'webhook',
): Promise<boolean> {
  const db = getPrisma();
  const now = new Date();

  const settled = await db.$transaction(async (tx) => {
    const moved = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: 'PAID' } },
      data: {
        status: 'PAID',
        paidAt: now,
        providerPaymentId: razorpayPaymentId,
        failureReason: null,
        // The signature is not kept: it is a credential, and it has served its
        // only purpose by the time this runs.
        meta: { confirmedVia: via, gatewayOrderId },
      },
    });
    if (moved.count === 0) return false;

    await tx.order.update({
      where: { id: payment.order.id },
      data: { paymentStatus: 'PAID' },
    });

    await tx.orderEvent.create({
      data: {
        orderId: payment.order.id,
        status: 'PENDING',
        message: `Online payment received (${razorpayPaymentId})`,
      },
    });
    return true;
  });

  // Now the order is a fact: the customer's confirmation and the shop's copy.
  // After the response, so the shopper sees their receipt before the mail
  // server is even asked.
  const userId = payment.order.userId;
  if (settled && userId) {
    after(async () => {
      const order = await getRepository().getOrderForUser(userId, payment.order.orderNumber);
      if (order) await sendOrderEmails(order);
    });
  }

  return settled;
}

/** Records a failed attempt, unless the payment has already succeeded. */
async function markPaymentFailed(paymentId: string, reason: string): Promise<void> {
  await getPrisma().payment.updateMany({
    where: { id: paymentId, status: { not: 'PAID' } },
    data: { status: 'FAILED', failureReason: reason.slice(0, 300) },
  });
}

export async function confirmOnlinePayment(
  input: ConfirmationInput,
): Promise<ConfirmationResult> {
  const provider = onlineProvider();
  if (!provider.verifyCheckout) {
    throw new AppError(
      'This payment method cannot be confirmed here.',
      400,
      'unsupported_provider',
    );
  }

  const db = getPrisma();

  // The payment row is found by the gateway order id, which the server itself
  // stored when it created the order. A forged id simply matches nothing.
  const payment = await db.payment.findFirst({
    where: { providerOrderId: input.razorpayOrderId },
    select: {
      id: true,
      status: true,
      order: { select: { id: true, orderNumber: true, userId: true } },
    },
  });

  if (!payment) {
    throw new AppError('That payment could not be found.', 404, 'payment_not_found');
  }

  // Authorisation, not just authentication: a valid signature proves Razorpay
  // saw the payment, not that the person asking is the one who owns the order.
  const user = await getSessionUser();
  if (!user || payment.order.userId !== user.id) {
    throw new AppError('That payment could not be found.', 404, 'payment_not_found');
  }

  const signatureValid = provider.verifyCheckout({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureValid) {
    // Recorded, not silently dropped: a mismatch is either a bug or somebody
    // trying, and both are worth being able to see afterwards.
    console.error(
      '[payments] signature mismatch for gateway order',
      input.razorpayOrderId,
    );
    await db.payment.updateMany({
      where: { id: payment.id, status: { not: 'PAID' } },
      data: { failureReason: 'Signature verification failed' },
    });
    throw new AppError(
      'We could not verify that payment. It has not been accepted.',
      400,
      'signature_mismatch',
    );
  }

  // Already confirmed — by the webhook, or by this endpoint on a refresh.
  // Saying yes again is correct; re-recording is not, and settlePayment
  // refuses to.
  await settlePayment(payment, input.razorpayPaymentId, input.razorpayOrderId, 'checkout');

  return { orderNumber: payment.order.orderNumber, paymentStatus: 'PAID' };
}

/** Records a payment the shopper abandoned or the gateway rejected. */
export async function recordPaymentFailure(
  razorpayOrderId: string,
  reason: string,
): Promise<void> {
  const db = getPrisma();
  const payment = await db.payment.findFirst({
    where: { providerOrderId: razorpayOrderId },
    select: { id: true, status: true, order: { select: { userId: true } } },
  });
  // Never overwrite a payment that has already succeeded.
  if (!payment || payment.status === 'PAID') return;

  const user = await getSessionUser();
  if (!user || payment.order.userId !== user.id) return;

  await markPaymentFailed(payment.id, reason);
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

/**
 * The part of a Razorpay webhook this shop reads. Razorpay sends far more;
 * anything not named here is ignored rather than rejected, so a new field in
 * their payload never stops payments being confirmed.
 */
const webhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z
      .object({
        entity: z.object({
          id: z.string(),
          order_id: z.string().nullish(),
          amount: z.number().int(),
          currency: z.string(),
          error_description: z.string().nullish(),
        }),
      })
      .optional(),
  }),
});

export type WebhookOutcome =
  | 'settled'
  | 'already_settled'
  | 'failure_recorded'
  | 'ignored'
  | 'unknown_order'
  | 'amount_mismatch';

/**
 * Handles one Razorpay webhook delivery.
 *
 * The signature is HMAC-SHA256 of the raw body with the webhook secret, so it
 * is checked before the body is even parsed. After that, everything that is
 * not a problem with the request answers 200: Razorpay retries anything else
 * for a day, and retrying an event about an order this shop has never heard
 * of will not make it any more known.
 */
export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string | null,
): Promise<WebhookOutcome> {
  if (!signature || !verifyRazorpayWebhook(rawBody, signature)) {
    console.error('[payments] webhook signature mismatch');
    throw new AppError('Invalid signature.', 400, 'signature_mismatch');
  }

  let parsed: z.infer<typeof webhookSchema>;
  try {
    parsed = webhookSchema.parse(JSON.parse(rawBody));
  } catch {
    // Signed by Razorpay but not shaped as expected: an event type this shop
    // does not use. Nothing to do, and nothing a retry would change.
    return 'ignored';
  }

  const { event } = parsed;
  const entity = parsed.payload.payment?.entity;
  const handled = event === 'payment.captured' || event === 'order.paid' || event === 'payment.failed';
  if (!handled || !entity?.order_id) return 'ignored';

  const payment = await getPrisma().payment.findFirst({
    where: { provider: 'razorpay', providerOrderId: entity.order_id },
    select: {
      id: true,
      status: true,
      amount: true,
      order: { select: { id: true, orderNumber: true, userId: true } },
    },
  });
  if (!payment) {
    console.warn('[payments] webhook for an unknown gateway order', entity.order_id);
    return 'unknown_order';
  }

  if (event === 'payment.failed') {
    if (payment.status === 'PAID') return 'already_settled';
    await markPaymentFailed(payment.id, entity.error_description || 'Payment failed at the gateway');
    return 'failure_recorded';
  }

  // The gateway order was created for exactly this amount, so a difference
  // means something is wrong upstream. Paid for less is not paid; staff can
  // see the payment in the Razorpay dashboard and settle it by hand.
  if (entity.amount !== payment.amount || entity.currency !== 'INR') {
    console.error(
      '[payments] webhook amount mismatch for',
      payment.order.orderNumber,
      { expected: payment.amount, received: entity.amount, currency: entity.currency },
    );
    return 'amount_mismatch';
  }

  const settled = await settlePayment(payment, entity.id, entity.order_id, 'webhook');
  return settled ? 'settled' : 'already_settled';
}
