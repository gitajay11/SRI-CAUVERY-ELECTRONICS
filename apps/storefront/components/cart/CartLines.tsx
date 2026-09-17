'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CartItemView } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { formatINR } from '@tamizh/core/money';
import {
  exampleQuantities,
  maxQuantity,
  quantityProblem,
  quantityRuleFor,
  stepDown,
  stepUp,
} from '@tamizh/core/quantity';
import { useCart } from '@/components/providers/CartProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { MinusIcon, PlusIcon, SpinnerIcon, TrashIcon } from '@/components/ui/Icons';

/**
 * Cart line items.
 *
 * Quantity changes go straight to the server, which is the only place that
 * knows current stock. While a change is in flight the row dims rather than
 * disappearing, so the list never jumps under a thumb, and the control that
 * was pressed shows a spinner — the bin while a line is being removed, the
 * count while it is being changed.
 *
 * The spinner stays until the change is on screen, not until the server has
 * answered. The two are a second apart: the server answers, and only then
 * does the refreshed page arrive with the line gone or the total corrected.
 * A spinner that stopped at the answer left a row that looked done but was
 * still there, which reads as a tap that failed.
 */
export function CartLines({ items }: { items: CartItemView[] }) {
  return (
    <ul className="divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-100 bg-surface">
      {items.map((item) => (
        <CartLine key={item.id} item={item} />
      ))}
    </ul>
  );
}

function CartLine({ item }: { item: CartItemView }) {
  const { t, pick } = useLocale();
  const { setQuantity, removeItem, pending } = useCart();
  // What this row is waiting on. Cleared when the cart has finished
  // refreshing, which is when the page shows the result.
  const [action, setAction] = useState<'remove' | 'quantity' | null>(null);
  const busy = action !== null;
  const name = pick(item.name, item.nameTa);

  /* eslint-disable react-hooks/set-state-in-effect --
     The refresh finishing is the event this row is waiting on, and it is
     only observable once the provider has rendered it. */
  useEffect(() => {
    if (!pending) setAction(null);
  }, [pending]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Bulk lines step by their rule and can be typed into; the same rule the
  // product page and the server apply, so nothing accepted here is refused
  // at the checkout.
  const rule = quantityRuleFor(item);
  const max = maxQuantity(rule, item.availableStock);
  const [typed, setTyped] = useState<string | null>(null);
  const typedNumber = typed === null ? null : Number.parseInt(typed, 10);
  const typedProblem =
    typedNumber === null
      ? null
      : Number.isNaN(typedNumber)
        ? 'below_minimum'
        : quantityProblem(typedNumber, rule, item.availableStock);

  const change = async (quantity: number) => {
    setAction(quantity === 0 ? 'remove' : 'quantity');
    const ok = await setQuantity(item.id, quantity);
    // A refused change refreshes nothing, so nothing else will clear this.
    if (!ok) setAction(null);
  };

  const commitTyped = async () => {
    if (typedNumber === null || typedProblem || typedNumber === item.quantity) {
      if (!typedProblem) setTyped(null);
      return;
    }
    setTyped(null);
    await change(typedNumber);
  };

  const remove = async () => {
    setAction('remove');
    const ok = await removeItem(item.id, name);
    if (!ok) setAction(null);
  };

  return (
    <li
      aria-busy={busy || undefined}
      className={cn(
        'flex gap-3 p-3 transition-opacity sm:gap-4 sm:p-4',
        busy && 'pointer-events-none opacity-70',
      )}
    >
      <Link
        href={`/product/${item.slug}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50 sm:size-24"
      >
        {item.image ? (
          <Image
            src={item.image.url}
            alt={item.image.alt || name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug text-ink-900 sm:text-[0.95rem]">
              <Link href={`/product/${item.slug}`} className="hover:text-link">
                {name}
              </Link>
            </h3>
            {item.variantName ? (
              <p className="mt-0.5 text-xs text-ink-500">{item.variantName}</p>
            ) : null}
            <p className="mt-0.5 font-mono text-xs text-ink-400">{item.sku}</p>
          </div>

          <button
            type="button"
            onClick={remove}
            disabled={busy}
            aria-label={`${t('common.remove')} ${name}`}
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-500"
          >
            {action === 'remove' ? (
              <SpinnerIcon className="text-lg text-danger-500" />
            ) : (
              <TrashIcon className="text-lg" />
            )}
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2.5">
          <div className="inline-flex items-center rounded-full border border-ink-200">
            <button
              type="button"
              // Below the minimum there is nothing to buy: the line goes.
              onClick={() =>
                change(item.quantity <= rule.min ? 0 : stepDown(item.quantity, rule))
              }
              disabled={busy}
              aria-label={t('product.decrease')}
              className="grid size-9 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-35"
            >
              <MinusIcon />
            </button>
            {rule.bulk ? (
              // The spinner sits over the typed figure, which stays put: the
              // box is what the shopper is looking at.
              <span className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min={rule.min}
                  max={max}
                  step={rule.step}
                  value={typed ?? String(item.quantity)}
                  disabled={busy}
                  aria-label={t('product.bulk.quantityLabel')}
                  aria-invalid={typedProblem ? true : undefined}
                  onChange={(event) => setTyped(event.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => void commitTyped()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void commitTyped();
                    }
                  }}
                  className={cn(
                    'w-16 border-x bg-transparent py-1.5 text-center text-sm font-bold tabular-nums outline-none',
                    typedProblem ? 'border-danger-500 text-danger-500' : 'border-ink-200 text-ink-900',
                    action === 'quantity' && 'text-transparent',
                  )}
                />
                {action === 'quantity' ? (
                  <SpinnerIcon className="pointer-events-none absolute inset-0 m-auto text-base text-ink-700" />
                ) : null}
              </span>
            ) : (
              <span
                aria-live="polite"
                className="grid w-9 place-items-center text-center text-sm font-bold tabular-nums"
              >
                {action === 'quantity' ? <SpinnerIcon className="text-base" /> : item.quantity}
              </span>
            )}
            <button
              type="button"
              onClick={() => change(stepUp(item.quantity, rule, item.availableStock))}
              disabled={busy || item.quantity >= max}
              aria-label={t('product.increase')}
              className="grid size-9 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-35"
            >
              <PlusIcon />
            </button>
          </div>

          <div className="text-right">
            <p className="text-base font-bold text-ink-900">
              {formatINR(item.lineTotal)}
            </p>
            {item.mrp > item.unitPrice ? (
              <p className="text-xs text-ink-400">
                <span className="line-through">{formatINR(item.mrp * item.quantity)}</span>
              </p>
            ) : null}
          </div>
        </div>

        {rule.bulk ? (
          <p
            role={typedProblem ? 'alert' : undefined}
            className={cn('mt-1.5 text-xs', typedProblem ? 'font-semibold text-danger-500' : 'text-ink-500')}
          >
            {typedProblem === 'below_minimum'
              ? t('product.bulk.belowMinimum', { min: rule.min })
              : typedProblem === 'not_a_multiple'
                ? t('product.bulk.notMultiple', { step: rule.step, examples: exampleQuantities(rule) })
                : typedProblem === 'above_stock'
                  ? t('product.bulk.aboveStock', { count: max })
                  : t('product.bulk.rule', { min: rule.min, step: rule.step })}
          </p>
        ) : item.availableStock <= 5 ? (
          <p className="mt-1.5 text-xs font-semibold text-warning-500">
            {t('product.lowStock', { count: item.availableStock })}
          </p>
        ) : null}
      </div>
    </li>
  );
}
