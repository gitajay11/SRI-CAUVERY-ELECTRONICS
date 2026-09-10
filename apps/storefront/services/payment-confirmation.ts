import 'server-only';
import { getPrisma } from '@tamizh/db';
import { AppError } from '@tamizh/core/api';
import { getSessionUser } from '@/lib/auth';
import { onlineProvider } from '@/services/payments';

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
      amount: true,
      order: { select: { id: true, orderNumber: true, userId: true, paymentStatus: true } },
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
    await db.payment.update({
      where: { id: payment.id },
      data: { failureReason: 'Signature verification failed' },
    });
    throw new AppError(
      'We could not verify that payment. It has not been accepted.',
      400,
      'signature_mismatch',
    );
  }

  // Already confirmed — Razorpay can call back more than once, and the shopper
  // can refresh. Saying yes again is correct; charging or re-recording is not.
  if (payment.status === 'PAID') {
    return { orderNumber: payment.order.orderNumber, paymentStatus: 'PAID' };
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidAt: now,
        providerPaymentId: input.razorpayPaymentId,
        failureReason: null,
        // The signature is not kept: it is a credential, and it has served its
        // only purpose by the time this runs.
        meta: { confirmedVia: 'checkout', gatewayOrderId: input.razorpayOrderId },
      },
    });

    await tx.order.update({
      where: { id: payment.order.id },
      data: { paymentStatus: 'PAID' },
    });

    await tx.orderEvent.create({
      data: {
        orderId: payment.order.id,
        status: 'PENDING',
        message: `Online payment received (${input.razorpayPaymentId})`,
      },
    });
  });

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

  await db.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED', failureReason: reason.slice(0, 300) },
  });
}
