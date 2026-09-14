'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
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
import { MinusIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons';

/**
 * Cart line items.
 *
 * Quantity changes go straight to the server, which is the only place that
 * knows current stock. While a change is in flight the row dims rather than
 * disappearing, so the list never jumps under a thumb.
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
  const { setQuantity, removeItem } = useCart();
  const [busy, setBusy] = useState(false);
  const name = pick(item.name, item.nameTa);

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
    setBusy(true);
    await setQuantity(item.id, quantity);
    setBusy(false);
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
    setBusy(true);
    await removeItem(item.id, name);
    setBusy(false);
  };

  return (
    <li
      className={cn(
        'flex gap-3 p-3 transition-opacity sm:gap-4 sm:p-4',
        busy && 'pointer-events-none opacity-55',
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
            aria-label={`${t('common.remove')} ${name}`}
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-500"
          >
            <TrashIcon className="text-lg" />
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
              aria-label={t('product.decrease')}
              className="grid size-9 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
            >
              <MinusIcon />
            </button>
            {rule.bulk ? (
              <input
                type="number"
                inputMode="numeric"
                min={rule.min}
                max={max}
                step={rule.step}
                value={typed ?? String(item.quantity)}
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
                )}
              />
            ) : (
              <span
                aria-live="polite"
                className="w-9 text-center text-sm font-bold tabular-nums"
              >
                {item.quantity}
              </span>
            )}
            <button
              type="button"
              onClick={() => change(stepUp(item.quantity, rule, item.availableStock))}
              disabled={item.quantity >= max}
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
