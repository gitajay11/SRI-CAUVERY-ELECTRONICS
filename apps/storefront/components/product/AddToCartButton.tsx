'use client';

import { useState } from 'react';
import { cn } from '@tamizh/core/utils';
import {
  exampleQuantities,
  firstQuantity,
  maxQuantity,
  quantityProblem,
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
 * minimum is the same as removing the line, which is what it means. On a
 * bulk line the count in the middle is also a box: someone who needs two
 * hundred types it, and the same rule judges what they typed.
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
  // What has been typed into a bulk line's box and not yet committed.
  const [typed, setTyped] = useState<string | null>(null);

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

    const typedNumber = typed === null ? null : Number.parseInt(typed, 10);
    const typedProblem =
      typedNumber === null
        ? null
        : Number.isNaN(typedNumber)
          ? 'below_minimum'
          : quantityProblem(typedNumber, rule, stock);

    const commitTyped = async () => {
      if (typedNumber === null) return;
      // A figure the shop does not sell stays on screen, marked, until it is
      // corrected — silently reverting it would hide what went wrong.
      if (typedProblem) return;
      setTyped(null);
      if (typedNumber !== line.quantity) await step(typedNumber);
    };

    const problemText =
      typedProblem === 'below_minimum'
        ? t('product.bulk.belowMinimum', { min: rule.min })
        : typedProblem === 'not_a_multiple'
          ? t('product.bulk.notMultiple', { step: rule.step, examples: exampleQuantities(rule) })
          : typedProblem === 'above_stock'
            ? t('product.bulk.aboveStock', { count: Number.isFinite(ceiling) ? ceiling : rule.min })
            : null;

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div
          className={cn(
            'inline-flex items-stretch justify-between gap-1 rounded-full bg-action p-1 text-on-action',
            size === 'sm' ? 'min-h-9' : size === 'lg' ? 'min-h-12' : 'min-h-11',
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

          {rule.bulk ? (
            <input
              type="number"
              inputMode="numeric"
              min={rule.min}
              step={rule.step}
              value={typed ?? String(line.quantity)}
              aria-label={t('product.bulk.quantityLabel')}
              aria-invalid={typedProblem ? true : undefined}
              disabled={busy || pending}
              onChange={(event) => setTyped(event.target.value.replace(/[^\d]/g, ''))}
              onBlur={() => void commitTyped()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void commitTyped();
                }
              }}
              // Stops the card's link from swallowing the tap.
              onClick={(event) => event.stopPropagation()}
              className={cn(
                'w-14 min-w-0 rounded-md bg-carbon-900/10 px-1 text-center text-sm font-bold tabular-nums text-on-action outline-none',
                'focus:bg-carbon-900/20',
                typedProblem && 'ring-2 ring-danger-solid',
              )}
            />
          ) : (
            <span
              aria-live="polite"
              className="grid min-w-8 place-items-center px-1 text-sm font-bold tabular-nums"
            >
              {line.quantity}
            </span>
          )}

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
        {problemText ? (
          <p role="alert" className="text-xs font-semibold leading-snug text-danger-500">
            {problemText}
          </p>
        ) : null}
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
