'use client';

import { useState } from 'react';
import { cn } from '@tamizh/core/utils';
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
 */
export function AddToCartButton({
  productId,
  productName,
  variantId = null,
  quantity = 1,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className,
}: {
  productId: string;
  productName: string;
  variantId?: string | null;
  quantity?: number;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { t } = useLocale();
  const { addItem, setQuantity, lineFor, pending } = useCart();
  const [busy, setBusy] = useState(false);

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
          onClick={() => step(line.quantity - 1)}
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
          onClick={() => step(line.quantity + 1)}
          disabled={busy || pending}
          aria-label={t('product.increase')}
          className="grid aspect-square place-items-center rounded-full transition-colors hover:bg-carbon-900/10 disabled:opacity-50"
        >
          <PlusIcon className="text-[1.1em]" />
        </button>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      loading={busy}
      className={className}
      onClick={async () => {
        setBusy(true);
        await addItem(productId, quantity, productName);
        setBusy(false);
      }}
    >
      {busy ? (
        t('product.adding')
      ) : (
        <>
          <CartIcon className="text-[1.15em]" />
          {t('product.addToCart')}
        </>
      )}
    </Button>
  );
}
