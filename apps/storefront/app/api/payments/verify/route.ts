import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRouteError, ok, readJson } from '@tamizh/core/api';
import { clientKey, consume, LIMITS } from '@tamizh/core/rate-limit';
import { confirmOnlinePayment, recordPaymentFailure } from '@/services/payment-confirmation';

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

/**
 * POST /api/payments/verify — confirm an online payment.
 *
 * Razorpay Checkout hands the browser an order id, a payment id and a
 * signature; this is where they are checked. The signature is HMAC-SHA256 of
 * "order_id|payment_id" keyed with the API secret, so only a response that
 * genuinely came from Razorpay can mark an order paid.
 *
 * Nothing about the amount is read from the request. That was settled from
 * the server-side cart when the order was placed.
 */

const verifySchema = z.object({
  razorpay_order_id: z.string().trim().min(1, 'Missing order id').max(120),
  razorpay_payment_id: z.string().trim().min(1, 'Missing payment id').max(120),
  razorpay_signature: z.string().trim().min(1, 'Missing signature').max(256),
});

const failureSchema = z.object({
  razorpay_order_id: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(300).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Same ceiling as checkout: guessing signatures is the one attack this
    // endpoint invites, and it is only worth attempting in volume.
    consume(clientKey(request, 'verify-payment'), LIMITS.checkout);

    const body = await readJson(request);

    // A dismissed modal or a declined card posts here too, so the order does
    // not sit in PENDING for ever with nothing recorded against it.
    if (body && typeof body === 'object' && 'failed' in body) {
      const failure = failureSchema.parse(body);
      await recordPaymentFailure(
        failure.razorpay_order_id,
        failure.reason || 'Payment was not completed',
      );
      return ok({ recorded: true }, noStore);
    }

    const input = verifySchema.parse(body);
    const result = await confirmOnlinePayment({
      razorpayOrderId: input.razorpay_order_id,
      razorpayPaymentId: input.razorpay_payment_id,
      razorpaySignature: input.razorpay_signature,
    });

    return ok(result, noStore);
  } catch (error) {
    return handleRouteError(error);
  }
}
