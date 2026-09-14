'use client';

import { useId, useState } from 'react';
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
 * two hundred and is not going to tap forty times — so a bulk line also
 * offers a box to type into, always on screen, never behind a toggle a
 * shopper would have to discover. The stepper and the box are two views of
 * one number: step and the box follows, type and the stepper follows.
 *
 * Both are checked against the same rule — at least the minimum, then
 * multiples of the step — and the server checks it again on every cart
 * write, so the two never disagree.
 */
export function ProductPurchasePanel({ product }: { product: ProductDetailView }) {
  const { t } = useLocale();
  const router = useRouter();
  const { addItem } = useCart();
  const noteId = useId();

  const rule = quantityRuleFor(product);
  const max = maxQuantity(rule, product.stock);
  const outOfStock = max <= 0;

  const [quantity, setQuantity] = useState(() => firstQuantity(rule));
  // What the shopper has typed, kept as text so a half-typed "2" on the way
  // to "25" is not snapped to something else underneath them.
  const [typed, setTyped] = useState(() => String(firstQuantity(rule)));
  const [buying, setBuying] = useState(false);

  const typedNumber = Number.parseInt(typed, 10);
  const typedProblem: QuantityProblem | 'empty' | null = !rule.bulk
    ? null
    : typed.trim() === '' || Number.isNaN(typedNumber)
      ? 'empty'
      : quantityProblem(typedNumber, rule, product.stock);

  const canBuy = !outOfStock && typedProblem === null;

  /** The stepper moved: the box shows the same figure. */
  const stepTo = (next: number) => {
    setQuantity(next);
    setTyped(String(next));
  };

  /** The box changed: the stepper follows once the figure is one we sell. */
  const typeTo = (raw: string) => {
    const clean = raw.replace(/[^\d]/g, '');
    setTyped(clean);
    const next = Number.parseInt(clean, 10);
    if (!Number.isNaN(next) && quantityProblem(next, rule, product.stock) === null) {
      setQuantity(next);
    }
  };

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
    const ok = await addItem(product.id, quantity, product.name);
    if (ok) router.push('/checkout');
    else setBuying(false);
  };

  return (
    <div className="space-y-4">
      {!outOfStock ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold text-ink-700">{t('product.quantity')}</span>
          <div className="inline-flex items-center rounded-full border border-ink-200 bg-surface">
            <StepButton
              label={t('product.decrease')}
              onClick={() => stepTo(stepDown(quantity, rule))}
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
              onClick={() => stepTo(stepUp(quantity, rule, product.stock))}
              disabled={quantity >= max}
            >
              <PlusIcon />
            </StepButton>
          </div>
          {product.stock <= 10 && !rule.bulk ? (
            <span className="text-sm font-semibold text-warning-500">
              {t('product.lowStock', { count: product.stock })}
            </span>
          ) : null}
        </div>
      ) : null}

      {rule.bulk && !outOfStock ? (
        <section
          aria-labelledby={`${noteId}-title`}
          className="rounded-card border border-action-edge/40 bg-success-50/60 p-4"
        >
          <h3 id={`${noteId}-title`} className="text-sm font-bold text-ink-900">
            {t('product.bulk.title')}
          </h3>
          <p className="mt-0.5 text-sm text-ink-600">
            {t('product.bulk.rule', { min: rule.min, step: rule.step })}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label htmlFor={`${noteId}-qty`} className="text-sm font-semibold text-ink-700">
              {t('product.bulk.quantityLabel')}
            </label>
            <input
              id={`${noteId}-qty`}
              type="number"
              inputMode="numeric"
              min={rule.min}
              max={max}
              step={rule.step}
              value={typed}
              aria-invalid={typedProblem ? true : undefined}
              aria-describedby={`${noteId}-note`}
              onChange={(event) => typeTo(event.target.value)}
              className={cn(
                'w-32 rounded-xl border bg-surface px-4 py-2.5 text-center text-lg font-bold tabular-nums text-ink-900 outline-none',
                typedProblem ? 'border-danger-500' : 'border-ink-300 focus:border-brand-500',
              )}
            />
          </div>

          <p
            id={`${noteId}-note`}
            role={typedProblem ? 'alert' : 'status'}
            className={cn(
              'mt-2.5 text-sm font-semibold',
              typedProblem ? 'text-danger-500' : 'text-ink-900',
            )}
          >
            {typedProblem
              ? problemText(typedProblem)
              : t('product.bulk.total', {
                  count: quantity,
                  unit: formatINR(product.price),
                  total: formatINR(product.price * quantity),
                })}
          </p>
        </section>
      ) : null}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <AddToCartButton
          productId={product.id}
          productName={product.name}
          minOrderQuantity={product.minOrderQuantity}
          stock={product.stock}
          quantity={quantity}
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
