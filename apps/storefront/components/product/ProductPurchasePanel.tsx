'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductDetailView } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { formatINR } from '@tamizh/core/money';
import {
  exampleQuantities,
  firstQuantity,
  maxQuantity,
  quantityProblem,
  quantityRuleFor,
  stepDown,
  stepUp,
  type QuantityProblem,
} from '@tamizh/core/quantity';
import { useCart } from '@/components/providers/CartProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { AddToCartButton } from './AddToCartButton';
import { WishlistButton } from './WishlistButton';
import { MinusIcon, PlusIcon } from '@/components/ui/Icons';

/**
 * Quantity chooser plus the buy actions.
 *
 * Two ways of choosing, because two kinds of buyer. Someone buying a cable
 * taps plus once or twice. Someone buying return gifts for a wedding needs
 * two hundred and is not going to tap forty times — so a bulk line offers
 * a box to type into, checked against the same rule as the buttons: at
 * least the minimum, then multiples of the step. The server checks the same
 * rule again on every cart write, so the two never disagree.
 */
export function ProductPurchasePanel({ product }: { product: ProductDetailView }) {
  const { t } = useLocale();
  const router = useRouter();
  const { addItem } = useCart();

  const rule = quantityRuleFor(product);
  const max = maxQuantity(rule, product.stock);
  const outOfStock = max <= 0;

  const [quantity, setQuantity] = useState(() => firstQuantity(rule));
  // Bulk entry: what the shopper has typed, kept as text so a half-typed
  // "2" on the way to "25" is not snapped to something else underneath them.
  const [bulkMode, setBulkMode] = useState(false);
  const [typed, setTyped] = useState(String(firstQuantity(rule)));
  const [buying, setBuying] = useState(false);

  const typedNumber = Number.parseInt(typed, 10);
  const typedProblem: QuantityProblem | 'empty' | null = bulkMode
    ? typed.trim() === '' || Number.isNaN(typedNumber)
      ? 'empty'
      : quantityProblem(typedNumber, rule, product.stock)
    : null;

  // What will actually be bought: the typed figure when it is valid, else
  // the stepper's. Never a figure the rule would refuse.
  const chosen = bulkMode && typedProblem === null ? typedNumber : quantity;
  const canBuy = !outOfStock && !(bulkMode && typedProblem !== null);

  const problemText = (problem: QuantityProblem | 'empty'): string => {
    switch (problem) {
      case 'empty':
        return t('product.bulk.enterQuantity');
      case 'below_minimum':
        return t('product.bulk.belowMinimum', { min: rule.min });
      case 'not_a_multiple':
        return t('product.bulk.notMultiple', { step: rule.step, examples: exampleQuantities(rule) });
      case 'above_stock':
        return t('product.bulk.aboveStock', { count: max });
    }
  };

  const buyNow = async () => {
    if (!canBuy) return;
    setBuying(true);
    const ok = await addItem(product.id, chosen, product.name);
    if (ok) router.push('/checkout');
    else setBuying(false);
  };

  return (
    <div className="space-y-4">
      {rule.bulk ? (
        <p className="rounded-lg bg-success-50 px-3 py-2 text-sm text-link">
          {t('product.bulk.rule', { min: rule.min, step: rule.step })}
        </p>
      ) : null}

      {!outOfStock ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-ink-700">{t('product.quantity')}</span>

            {!bulkMode ? (
              <div className="inline-flex items-center rounded-full border border-ink-200 bg-surface">
                <StepButton
                  label={t('product.decrease')}
                  onClick={() => setQuantity((value) => stepDown(value, rule))}
                  disabled={quantity <= rule.min}
                >
                  <MinusIcon />
                </StepButton>
                <span
                  aria-live="polite"
                  className="min-w-14 border-x border-ink-200 py-2.5 text-center text-base font-bold tabular-nums text-ink-900"
                >
                  {quantity}
                </span>
                <StepButton
                  label={t('product.increase')}
                  onClick={() => setQuantity((value) => stepUp(value, rule, product.stock))}
                  disabled={quantity >= max}
                >
                  <PlusIcon />
                </StepButton>
              </div>
            ) : (
              <input
                type="number"
                inputMode="numeric"
                min={rule.min}
                max={max}
                step={rule.step}
                value={typed}
                aria-label={t('product.bulk.quantityLabel')}
                aria-invalid={typedProblem ? true : undefined}
                aria-describedby="bulk-quantity-note"
                onChange={(event) => setTyped(event.target.value.replace(/[^\d]/g, ''))}
                className={cn(
                  'w-28 rounded-full border bg-surface px-4 py-2.5 text-center text-base font-bold tabular-nums text-ink-900 outline-none',
                  typedProblem ? 'border-danger-500' : 'border-ink-200 focus:border-brand-500',
                )}
              />
            )}

            {rule.bulk ? (
              <button
                type="button"
                onClick={() => {
                  setBulkMode((on) => !on);
                  setTyped(String(quantity));
                }}
                aria-pressed={bulkMode}
                className={cn(
                  'min-h-9 rounded-full border px-3.5 text-sm font-semibold transition-colors',
                  bulkMode
                    ? 'border-brand-500 bg-success-50 text-link'
                    : 'border-ink-300 text-ink-700 hover:border-action-edge hover:text-link',
                )}
              >
                {t('product.bulk.toggle')}
              </button>
            ) : null}

            {product.stock <= 10 && !rule.bulk ? (
              <span className="text-sm font-semibold text-warning-500">
                {t('product.lowStock', { count: product.stock })}
              </span>
            ) : null}
          </div>

          {rule.bulk ? (
            <p
              id="bulk-quantity-note"
              role={typedProblem ? 'alert' : undefined}
              className={cn('text-sm', typedProblem ? 'text-danger-500' : 'text-ink-600')}
            >
              {typedProblem
                ? problemText(typedProblem)
                : t('product.bulk.total', {
                    count: chosen,
                    total: formatINR(product.price * chosen),
                  })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <AddToCartButton
          productId={product.id}
          productName={product.name}
          minOrderQuantity={product.minOrderQuantity}
          stock={product.stock}
          quantity={chosen}
          disabled={outOfStock}
          inactive={!canBuy}
          size="lg"
          variant="secondary"
          className="flex-1"
        />
        <Button
          size="lg"
          variant="primary"
          className="flex-1"
          disabled={!canBuy}
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
