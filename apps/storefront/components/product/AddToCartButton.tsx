'use client';

import { useState } from 'react';
import { cn } from '@tamizh/core/utils';
import {
  firstQuantity,
  maxQuantity,
  quantityRuleFor,
  stepDown,
  stepUp,
} from '@tamizh/core/quantity';
import { useCart } from '@/components/providers/CartProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';
import { CartIcon, MinusIcon, PlusIcon } from '@/components/ui/Icons';

/**
 * Add-to-cart control.
 *
 * Once something is in the cart the button becomes a stepper showing how many
 * are in there. It used to flash "Added" for two seconds and then revert to
 * "Add to cart", which threw away the one fact the shopper wanted next — how
 * many they now have — and made a second press look like the first, so it was
 * impossible to tell a successful add from one that had not registered.
 *
 * The stepper is also the shortest path to the correction people actually
 * make: adding one too many and wanting it back off again, without a trip to
 * the cart page.
 *
 * A bulk line steps by its rule rather than by one, and its first press adds
 * the minimum — nobody buys a single wedding favour. Stepping below the
 * minimum is the same as removing the line, which is what it means.
 */
export function AddToCartButton({
  productId,
  productName,
  variantId = null,
  minOrderQuantity = null,
  stock,
  quantity,
  disabled = false,
  inactive = false,
  variant = 'primary',
  size = 'md',
  className,
}: {
  productId: string;
  productName: string;
  variantId?: string | null;
  /** From the product; decides whether this is a bulk line. */
  minOrderQuantity?: number | null;
  /** Units available, for the stepper's ceiling. Unknown means no ceiling here. */
  stock?: number;
  /** How many the first press adds. Defaults to the rule's minimum. */
  quantity?: number;
  /** Out of stock: the button says so and does nothing. */
  disabled?: boolean;
  /** Cannot be pressed right now, but the reason is elsewhere on screen. */
  inactive?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { t } = useLocale();
  const { addItem, setQuantity, lineFor, pending } = useCart();
  const [busy, setBusy] = useState(false);

  const rule = quantityRuleFor({ minOrderQuantity });
  const ceiling = stock === undefined ? Number.POSITIVE_INFINITY : maxQuantity(rule, stock);
  const line = lineFor(productId, variantId);

  if (disabled) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className={cn('cursor-not-allowed', className)}
      >
        {t('product.outOfStock')}
      </Button>
    );
  }

  if (line) {
    const step = async (next: number) => {
      setBusy(true);
      await setQuantity(line.itemId, next);
      setBusy(false);
    };
    // Below the minimum there is nothing to buy, so the line goes.
    const down = line.quantity <= rule.min ? 0 : stepDown(line.quantity, rule);
    const up = stepUp(line.quantity, rule, ceiling);

    return (
      <div
        className={cn(
          'inline-flex items-stretch justify-between gap-1 rounded-full bg-action p-1 text-on-action',
          size === 'sm' ? 'min-h-9' : size === 'lg' ? 'min-h-12' : 'min-h-11',
          className,
        )}
      >
        <button
          type="button"
          onClick={() => step(down)}
          disabled={busy || pending}
          aria-label={t('product.decrease')}
          className="grid aspect-square place-items-center rounded-full transition-colors hover:bg-carbon-900/10 disabled:opacity-50"
        >
          <MinusIcon className="text-[1.1em]" />
        </button>

        <span
          aria-live="polite"
          className="grid min-w-8 place-items-center px-1 text-sm font-bold tabular-nums"
        >
          {line.quantity}
        </span>

        <button
          type="button"
          onClick={() => step(up)}
          disabled={busy || pending || up === line.quantity}
          aria-label={t('product.increase')}
          className="grid aspect-square place-items-center rounded-full transition-colors hover:bg-carbon-900/10 disabled:opacity-50"
        >
          <PlusIcon className="text-[1.1em]" />
        </button>
      </div>
    );
  }

  const toAdd = quantity ?? firstQuantity(rule);

  return (
    <Button
      variant={variant}
      size={size}
      loading={busy}
      disabled={inactive}
      className={className}
      onClick={async () => {
        setBusy(true);
        await addItem(productId, toAdd, productName);
        setBusy(false);
      }}
    >
      {busy ? (
        t('product.adding')
      ) : (
        <>
          <CartIcon className="text-[1.15em]" />
          {rule.bulk ? t('product.addToCartBulk', { count: toAdd }) : t('product.addToCart')}
        </>
      )}
    </Button>
  );
}
