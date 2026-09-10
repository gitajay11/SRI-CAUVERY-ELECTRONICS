'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api } from '@/lib/http';
import type { CouponFormValues } from '@/lib/coupon-form';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Panel } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import {
  CheckboxField,
  FieldGroup,
  FormError,
  MoneyField,
  RadioCards,
  TextAreaField,
  TextField,
} from '@/components/ui/Field';

/**
 * Create or edit a coupon.
 *
 * The discount field changes with the type — a percentage and a rupee amount
 * are different things, and one input pretending to be both is how a 50%
 * coupon becomes a ₹50 coupon. Empty limits mean "no limit" rather than zero.
 */
export function CouponForm({
  initial,
  categories,
  locked,
}: {
  initial: CouponFormValues;
  categories: { id: string; name: string; parentId: string | null }[];
  /** Set when the coupon has been redeemed: the discount can no longer change. */
  locked: boolean;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();

  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const isNew = !initial.id;

  const set = <K extends keyof CouponFormValues>(key: K, value: CouponFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }

    const payload = {
      code: values.code,
      description: values.description,
      type: values.type,
      percentValue: values.type === 'PERCENT' ? Number(values.value) || 0 : undefined,
      flatValue: values.type === 'FLAT' ? Number(values.value) || 0 : undefined,
      minOrder: Number(values.minOrder) || 0,
      maxDiscount: values.maxDiscount ? Number(values.maxDiscount) : null,
      startsAt: values.startsAt || undefined,
      endsAt: values.endsAt || null,
      usageLimit: values.usageLimit ? Number(values.usageLimit) : null,
      perUserLimit: values.perUserLimit ? Number(values.perUserLimit) : null,
      isActive: values.isActive,
      categoryIds: values.categoryIds,
      productIds: [],
    };

    setBusy(true);
    try {
      if (isNew) {
        await api.post('/api/admin/coupons', payload);
        toast(t('coupons.created'));
      } else {
        await api.put(`/api/admin/coupons/${initial.id}`, payload);
        toast(t('coupons.updated'));
      }
      router.push('/coupons');
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else setError(t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const parents = categories.filter((category) => category.parentId === null);

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-5">
      {error ? <FormError>{error}</FormError> : null}

      <Panel>
        <FieldGroup columns={2}>
          <TextField
            label={t('coupons.code')}
            value={values.code}
            onChange={(event) =>
              set('code', event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
            }
            required
            className="font-mono uppercase"
            error={fields.code}
          />
          <TextField
            label={t('coupons.startsAt')}
            type="date"
            value={values.startsAt}
            onChange={(event) => set('startsAt', event.target.value)}
          />
          <div className="sm:col-span-2">
            <TextAreaField
              label={t('common.name')}
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              rows={2}
              required
              hint="Shown to shoppers when the coupon applies."
              error={fields.description}
            />
          </div>
        </FieldGroup>
      </Panel>

      <Panel title={t('coupons.type')}>
        <div className="space-y-4">
          <RadioCards
            label={t('coupons.type')}
            value={values.type}
            onChange={(type) => set('type', type)}
            options={[
              {
                value: 'PERCENT',
                label: t('coupons.percent'),
                description: '10% off the qualifying items',
              },
              {
                value: 'FLAT',
                label: t('coupons.flat'),
                description: '₹100 off the order',
              },
              {
                value: 'FREE_SHIPPING',
                label: t('coupons.freeShipping'),
                description: t('coupons.freeShippingHint'),
              },
            ]}
          />

          {locked ? (
            <p className="rounded-lg bg-caution-50 px-3 py-2 text-sm text-caution-600">
              {t('coupons.lockedHint')}
            </p>
          ) : null}

          <FieldGroup columns={2}>
            {/* Nothing to enter for a waiver: the saving is whatever delivery
                would have cost on that order, which is not known until there
                is an order. */}
            {values.type === 'FREE_SHIPPING' ? null : values.type === 'PERCENT' ? (
              <TextField
                label={t('coupons.value')}
                type="number"
                min={1}
                max={100}
                step="0.01"
                value={values.value}
                onChange={(event) => set('value', event.target.value)}
                required
                aside="%"
                disabled={locked}
                error={fields.value ?? fields.percentValue}
              />
            ) : (
              <MoneyField
                label={t('coupons.value')}
                value={values.value}
                onChange={(event) => set('value', event.target.value)}
                required
                disabled={locked}
                error={fields.value ?? fields.flatValue}
              />
            )}

            <MoneyField
              label={t('coupons.minOrder')}
              value={values.minOrder}
              onChange={(event) => set('minOrder', event.target.value)}
              hint="0 means no minimum."
            />

            {values.type === 'PERCENT' ? (
              <MoneyField
                label={t('coupons.maxDiscount')}
                value={values.maxDiscount}
                onChange={(event) => set('maxDiscount', event.target.value)}
                optionalLabel={t('common.optional')}
                hint="Caps how much a percentage coupon can take off."
              />
            ) : null}
          </FieldGroup>
        </div>
      </Panel>

      <Panel title={t('coupons.usageLimit')}>
        <FieldGroup columns={2}>
          <TextField
            label={t('coupons.usageLimit')}
            type="number"
            min={1}
            value={values.usageLimit}
            onChange={(event) => set('usageLimit', event.target.value)}
            placeholder={t('coupons.unlimited')}
            optionalLabel={t('common.optional')}
          />
          <TextField
            label={t('coupons.perUserLimit')}
            type="number"
            min={1}
            value={values.perUserLimit}
            onChange={(event) => set('perUserLimit', event.target.value)}
            placeholder={t('coupons.unlimited')}
            optionalLabel={t('common.optional')}
          />
          <TextField
            label={t('coupons.endsAt')}
            type="date"
            value={values.endsAt}
            onChange={(event) => set('endsAt', event.target.value)}
            optionalLabel={t('common.optional')}
            error={fields.endsAt}
          />
          <div className="flex items-end pb-2.5">
            <CheckboxField
              label={t('categories.active')}
              checked={values.isActive}
              onChange={(event) => set('isActive', event.target.checked)}
            />
          </div>
        </FieldGroup>
      </Panel>

      <Panel title={t('coupons.scope')} description={t('coupons.scopeHint')}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {parents.map((category) => {
            const checked = values.categoryIds.includes(category.id);
            return (
              <li key={category.id}>
                <CheckboxField
                  label={category.name}
                  checked={checked}
                  onChange={(event) =>
                    set(
                      'categoryIds',
                      event.target.checked
                        ? [...values.categoryIds, category.id]
                        : values.categoryIds.filter((id) => id !== category.id),
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
        {values.categoryIds.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t('coupons.allProducts')}</p>
        ) : null}
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {isNew ? t('common.create') : t('common.save')}
        </Button>
        <Link
          href="/coupons"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:border-slate-400"
        >
          {t('common.cancel')}
        </Link>
      </div>
    </form>
  );
}
