'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductDetailView } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { useCart } from '@/components/providers/CartProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { AddToCartButton } from './AddToCartButton';
import { WishlistButton } from './WishlistButton';
import { MinusIcon, PlusIcon } from '@/components/ui/Icons';

/**
 * Quantity stepper plus the buy actions.
 *
 * The stepper is clamped to available stock on the client for responsiveness;
 * the server clamps again on every cart write, so the two never disagree in a
 * way that could oversell.
 */
export function ProductPurchasePanel({ product }: { product: ProductDetailView }) {
  const { t } = useLocale();
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);

  const outOfStock = product.stock <= 0;
  const max = Math.min(product.stock, 99);

  const buyNow = async () => {
    setBuying(true);
    const ok = await addItem(product.id, quantity, product.name);
    if (ok) router.push('/checkout');
    else setBuying(false);
  };

  return (
    <div className="space-y-4">
      {!outOfStock ? (
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-ink-700">
            {t('product.quantity')}
          </span>
          <div className="inline-flex items-center rounded-full border border-ink-200 bg-surface">
            <StepButton
              label={t('product.decrease')}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
            >
              <MinusIcon />
            </StepButton>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              value={quantity}
              aria-label={t('product.quantity')}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(next)) {
                  setQuantity(Math.min(Math.max(1, next), max));
                }
              }}
              className="w-12 border-x border-ink-200 bg-transparent py-2.5 text-center text-base font-bold text-ink-900 outline-none"
            />
            <StepButton
              label={t('product.increase')}
              onClick={() => setQuantity((value) => Math.min(max, value + 1))}
              disabled={quantity >= max}
            >
              <PlusIcon />
            </StepButton>
          </div>
          {product.stock <= 10 ? (
            <span className="text-sm font-semibold text-warning-500">
              {t('product.lowStock', { count: product.stock })}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <AddToCartButton
          productId={product.id}
          productName={product.name}
          quantity={quantity}
          disabled={outOfStock}
          size="lg"
          variant="secondary"
          className="flex-1"
        />
        <Button
          size="lg"
          variant="primary"
          className="flex-1"
          disabled={outOfStock}
          loading={buying}
          onClick={buyNow}
        >
          {t('product.buyNow')}
        </Button>
        <WishlistButton productId={product.id} size="lg" className="sm:size-13" />
      </div>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'grid size-11 place-items-center rounded-full text-lg text-ink-700 transition-colors',
        'hover:bg-ink-100 disabled:opacity-35 disabled:hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}
