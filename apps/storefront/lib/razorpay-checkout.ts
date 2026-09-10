/**
 * Opening Razorpay Checkout from the browser.
 *
 * The script is fetched on demand rather than in the document head: almost
 * nobody who lands on the shop reaches checkout, and fewer still pay online,
 * so loading a third-party script on every page would cost every visitor for
 * the benefit of a handful.
 *
 * Nothing secret passes through here. The key id is publishable and arrives
 * from the server as part of the order that was just created; the API secret
 * exists only on the server, and the signature this returns is meaningless
 * until the server checks it against that secret.
 */

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpayClientConfig {
  key: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  orderNumber: string;
}

export interface RazorpayHandshake {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type RazorpayOutcome =
  | { status: 'paid'; handshake: RazorpayHandshake }
  | { status: 'dismissed' }
  | { status: 'failed'; reason: string };

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loader: Promise<void> | null = null;

/** Loads checkout.js once, however many times checkout is attempted. */
function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement('script');

    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        // A failed load must not be cached as a resolved promise, or every
        // later attempt fails instantly with no way to recover.
        loader = null;
        reject(new Error('Razorpay Checkout could not be loaded'));
      },
      { once: true },
    );

    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return loader;
}

/**
 * Opens the payment modal and resolves once the shopper is finished with it.
 *
 * Every ending resolves rather than throwing — paid, dismissed and failed are
 * all ordinary outcomes of asking somebody to pay, and the caller has
 * something different to say about each.
 */
export async function openRazorpayCheckout(
  config: RazorpayClientConfig,
  shopper: { name: string; email: string; phone: string; shopName: string },
): Promise<RazorpayOutcome> {
  await loadScript();

  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error('Razorpay Checkout is unavailable');

  return new Promise<RazorpayOutcome>((resolve) => {
    // Whichever ending arrives first wins. Razorpay can fire `payment.failed`
    // and then the dismiss handler for the same attempt, and the shopper
    // should be told about the failure, not the dismissal.
    let settled = false;
    const settle = (outcome: RazorpayOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const instance = new Razorpay({
      key: config.key,
      amount: config.amount,
      currency: config.currency,
      order_id: config.razorpayOrderId,
      name: shopper.shopName,
      description: `Order ${config.orderNumber}`,
      prefill: {
        name: shopper.name,
        email: shopper.email,
        contact: shopper.phone,
      },
      notes: { orderNumber: config.orderNumber },
      theme: { color: '#8a6a19' },
      modal: {
        ondismiss: () => settle({ status: 'dismissed' }),
      },
      handler: (response: unknown) => {
        const handshake = response as Partial<RazorpayHandshake>;
        if (
          !handshake.razorpay_order_id ||
          !handshake.razorpay_payment_id ||
          !handshake.razorpay_signature
        ) {
          settle({ status: 'failed', reason: 'Incomplete response from Razorpay' });
          return;
        }
        settle({ status: 'paid', handshake: handshake as RazorpayHandshake });
      },
    });

    instance.on('payment.failed', (response: unknown) => {
      const detail = response as { error?: { description?: string; reason?: string } };
      settle({
        status: 'failed',
        reason: detail.error?.description || detail.error?.reason || 'Payment failed',
      });
    });

    instance.open();
  });
}
