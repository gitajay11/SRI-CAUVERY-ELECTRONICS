import { NextResponse } from 'next/server';
import { fail, handleRouteError, ok } from '@tamizh/core/api';
import { razorpay } from '@/lib/env';
import { handleRazorpayWebhook } from '@/services/payment-confirmation';

/**
 * POST /api/payments/webhook — Razorpay's server-to-server confirmation.
 *
 * The browser handshake at /api/payments/verify only happens if the shopper's
 * browser survives long enough to post it. This is the copy of the same news
 * that does not depend on them: Razorpay calls it directly, signed with the
 * webhook secret (not the API secret — see services/payments.ts).
 *
 * Configure it in the Razorpay dashboard (Settings → Webhooks) with this URL,
 * the same secret as RAZORPAY_WEBHOOK_SECRET, and the events
 * payment.captured, payment.failed and order.paid.
 *
 * The body is read as text: the signature covers the exact bytes Razorpay
 * sent, and parsing and re-serialising them would not reproduce them.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Answered with 503, not 500, so Razorpay keeps retrying while the secret
  // is being set rather than the events being lost.
  if (!razorpay.webhookConfigured()) {
    console.error('[payments] webhook received but RAZORPAY_WEBHOOK_SECRET is not set');
    return fail('Webhook not configured.', 503, { code: 'webhook_not_configured' });
  }

  try {
    const rawBody = await request.text();
    const outcome = await handleRazorpayWebhook(
      rawBody,
      request.headers.get('x-razorpay-signature'),
    );
    return ok({ outcome }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleRouteError(error);
  }
}
