'use client';

import { useState } from 'react';
import { cn } from '@tamizh/core/utils';
import { useCart } from '@/components/providers/CartProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';
import { CartIcon, CheckIcon } from '@/components/ui/Icons';

/**
 * Add-to-cart control.
 *
 * Shows a short "added" confirmation in place of the label so a shopper adding
 * several items from a grid gets feedback per card, not only in the header
 * badge. Disabled and labelled clearly when the item is out of stock.
 */
export function AddToCartButton({
  productId,
  productName,
  quantity = 1,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className,
}: {
  productId: string;
  productName: string;
  quantity?: number;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { t } = useLocale();
  const { addItem } = useCart();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');

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

  return (
    <Button
      variant={state === 'done' ? 'secondary' : variant}
      size={size}
      loading={state === 'busy'}
      className={className}
      onClick={async () => {
        setState('busy');
        const ok = await addItem(productId, quantity, productName);
        setState(ok ? 'done' : 'idle');
        if (ok) setTimeout(() => setState('idle'), 2000);
      }}
    >
      {state === 'done' ? (
        <>
          <CheckIcon className="text-[1.15em]" />
          {t('product.added')}
        </>
      ) : state === 'busy' ? (
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
