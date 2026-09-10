import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { PaymentStatus } from '@tamizh/core/types';
import { paymentProvider, razorpay } from '@/lib/env';
import { AppError } from '@tamizh/core/api';

/**
 * Payment gateway abstraction.
 *
 * Checkout never talks to a gateway SDK directly — it asks for a provider and
 * calls this interface. Adding Razorpay in production is a matter of setting
 * PAYMENT_PROVIDER=razorpay plus the two key variables; no checkout code
 * changes. Secrets are read from the environment and never sent to the client.
 */

export interface PaymentIntent {
  /** Provider key stored on the Payment row. */
  provider: string;
  /** Gateway order id, if the gateway created one. */
  providerOrderId: string | null;
  /** Status the order should start in. */
  status: PaymentStatus;
  /**
   * Everything the browser needs to open the gateway's checkout widget.
   * Publishable values only — never a secret key.
   */
  clientConfig: Record<string, string | number> | null;
  /** True when the order is fully placed without any further browser step. */
  completed: boolean;
}

export interface PaymentProvider {
  readonly key: string;
  readonly supportsOnline: boolean;
  /**
   * @param amount total payable in paise
   */
  createIntent(input: {
    amount: number;
    orderNumber: string;
    customerEmail: string;
    customerPhone: string;
  }): Promise<PaymentIntent>;
  /** Verifies a gateway webhook signature. */
  verifySignature(payload: string, signature: string): boolean;
  /**
   * Verifies the handshake Razorpay Checkout hands back to the browser.
   *
   * Separate from the webhook check because it is a different secret over a
   * different payload, and conflating the two is how a gateway integration
   * ends up accepting forged confirmations.
   */
  verifyCheckout?(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;
}

/**
 * Constant-time comparison.
 *
 * A plain `===` on a signature returns faster the earlier it finds a
 * difference, which is enough to recover a valid signature one byte at a time.
 * Lengths are compared first because timingSafeEqual throws on a mismatch.
 */
function safeEqual(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Cash on delivery — always available, no gateway involved. */
const codProvider: PaymentProvider = {
  key: 'cod',
  supportsOnline: false,
  async createIntent() {
    return {
      provider: 'cod',
      providerOrderId: null,
      status: 'COD_PENDING',
      clientConfig: null,
      completed: true,
    };
  },
  verifySignature() {
    return false;
  },
};

/**
 * Development stand-in for a real gateway.
 *
 * It mints a fake gateway order id and marks the payment authorised so the
 * whole checkout → order → admin flow can be exercised end to end without
 * gateway credentials. It never claims money was captured.
 */
const mockProvider: PaymentProvider = {
  key: 'mock',
  supportsOnline: true,
  async createIntent({ amount, orderNumber }) {
    return {
      provider: 'mock',
      providerOrderId: `mock_${randomBytes(8).toString('hex')}`,
      status: 'AUTHORIZED',
      clientConfig: {
        provider: 'mock',
        amount,
        currency: 'INR',
        orderNumber,
        notice: 'Test mode — no money is charged.',
      },
      completed: true,
    };
  },
  verifySignature() {
    return true;
  },
  /** Test mode has no signature to check; the flow is what is being tested. */
  verifyCheckout() {
    return true;
  },
};

/**
 * Razorpay.
 *
 * `createIntent` returns the publishable key id and the amount so the browser
 * can open Razorpay Checkout; the server later confirms the payment by
 * verifying the signature Razorpay sends back.
 */
const razorpayProvider: PaymentProvider = {
  key: 'razorpay',
  supportsOnline: true,
  async createIntent({ amount, orderNumber, customerEmail, customerPhone }) {
    const keyId = razorpay.keyId();
    const keySecret = razorpay.keySecret();

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: orderNumber,
        notes: { orderNumber, customerEmail, customerPhone },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[payments] Razorpay order creation failed', response.status, detail);
      throw new AppError(
        'We could not start the online payment. Please try cash on delivery, or try again shortly.',
        502,
        'payment_gateway_error',
      );
    }

    const order = (await response.json()) as { id: string };
    return {
      provider: 'razorpay',
      providerOrderId: order.id,
      status: 'PENDING',
      clientConfig: {
        provider: 'razorpay',
        key: keyId, // publishable by design
        amount,
        currency: 'INR',
        razorpayOrderId: order.id,
        orderNumber,
      },
      completed: false,
    };
  },
  /**
   * Webhooks. Signed with the webhook secret over the raw request body — a
   * different secret from the one below, which is why they are separate.
   */
  verifySignature(payload: string, signature: string) {
    const expected = createHmac('sha256', razorpay.webhookSecret())
      .update(payload)
      .digest('hex');
    return safeEqual(expected, signature);
  },

  /**
   * The browser handshake: HMAC-SHA256 of "order_id|payment_id" keyed with the
   * API secret.
   *
   * This is the only thing standing between a real payment and a forged one.
   * The browser can send any three strings it likes to the verify endpoint;
   * only Razorpay and this server know the secret that makes them agree.
   */
  verifyCheckout({ orderId, paymentId, signature }) {
    const expected = createHmac('sha256', razorpay.keySecret())
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return safeEqual(expected, signature);
  },
};

const providers: Record<string, PaymentProvider> = {
  cod: codProvider,
  mock: mockProvider,
  razorpay: razorpayProvider,
};

/** The provider used for ONLINE payments, per PAYMENT_PROVIDER. */
export function onlineProvider(): PaymentProvider {
  return providers[paymentProvider] ?? mockProvider;
}

export function providerFor(method: 'COD' | 'ONLINE'): PaymentProvider {
  return method === 'COD' ? codProvider : onlineProvider();
}

/**
 * Whether the storefront should offer the online payment option.
 * Razorpay is only offered once its keys are actually configured.
 */
export function onlinePaymentAvailable(): boolean {
  if (paymentProvider === 'razorpay') return razorpay.isConfigured();
  return onlineProvider().supportsOnline;
}
