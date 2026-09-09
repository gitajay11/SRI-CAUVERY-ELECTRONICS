'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductStatus } from '@tamizh/db/enums';
import type { ProductFormValues } from '@/lib/product-form';
import { cn, slugify } from '@tamizh/core/utils';
import { discountPercent, formatINR, rupeesToPaise } from '@tamizh/core/money';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Panel, Badge } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import {
  CheckboxField,
  FieldGroup,
  FormError,
  MoneyField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/Field';
import { CloseIcon, ExternalIcon, PlusIcon, UploadIcon } from '@/components/ui/Icons';
import { Thumb } from '@/components/ui/Thumb';

/**
 * Create and edit a product.
 *
 * Prices are typed in rupees and converted server-side. Stock is deliberately
 * absent when editing: it is only editable through Inventory, so that every
 * movement carries a reason and lands in the ledger. On a new product, an
 * opening quantity is allowed and is written as a PURCHASE movement.
 */

export function ProductForm({
  initial,
  categories,
  storefrontUrl,
  canEditPrice,
}: {
  initial: ProductFormValues;
  categories: { id: string; name: string; parentId: string | null }[];
  storefrontUrl: string;
  canEditPrice: boolean;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();

  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const isNew = !initial.id;
  // Products live in leaf categories; a parent is a browsing bucket.
  const assignable = categories.filter((category) => category.parentId !== null);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const priceNumber = Number(values.price) || 0;
  const mrpNumber = Number(values.mrp) || 0;
  const costNumber = Number(values.costPrice) || 0;
  const discount =
    mrpNumber > 0 && priceNumber > 0 && mrpNumber >= priceNumber
      ? discountPercent(rupeesToPaise(mrpNumber), rupeesToPaise(priceNumber))
      : 0;
  const margin = priceNumber > 0 && costNumber > 0 ? priceNumber - costNumber : null;

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/admin/uploads', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new ApiError(payload?.error?.message ?? 'Upload failed', response.status);
      set('images', [...values.images, { url: payload.data.url, alt: values.name }]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }
    if (priceNumber > mrpNumber) {
      setFields({ price: t('products.priceAboveMrp') });
      setError(t('error.validation'));
      return;
    }

    const payload = {
      sku: values.sku,
      slug: values.slug,
      name: values.name,
      nameTa: values.nameTa,
      description: values.description,
      descriptionTa: values.descriptionTa,
      brand: values.brand,
      categoryId: values.categoryId,
      mrp: Number(values.mrp) || 0,
      price: Number(values.price) || 0,
      costPrice: Number(values.costPrice) || 0,
      taxBps: Number(values.taxPercent) || 0,
      stock: Number(values.stock) || 0,
      lowStockThreshold: Number(values.lowStockThreshold) || 0,
      weightGrams: values.weightGrams ? Number(values.weightGrams) : null,
      lengthMm: values.lengthMm ? Number(values.lengthMm) : null,
      widthMm: values.widthMm ? Number(values.widthMm) : null,
      heightMm: values.heightMm ? Number(values.heightMm) : null,
      status: values.status,
      isFeatured: values.isFeatured,
      isBestSeller: values.isBestSeller,
      isNewArrival: values.isNewArrival,
      tags: values.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      specs: Object.fromEntries(
        values.specs
          .filter((spec) => spec.key.trim() && spec.value.trim())
          .map((spec) => [spec.key.trim(), spec.value.trim()]),
      ),
      images: values.images,
    };

    setBusy(true);
    try {
      if (isNew) {
        const result = await api.post<{ id: string }>('/api/admin/products', payload);
        toast(t('products.created'));
        router.push(`/products/${result.id}`);
      } else {
        await api.put(`/api/admin/products/${initial.id}`, payload);
        toast(t('products.updated'));
        router.refresh();
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else setError(t('error.saveFailed'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error ? <FormError>{error}</FormError> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Panel title={t('common.name')}>
            <FieldGroup columns={2}>
              <div className="sm:col-span-2">
                <TextField
                  label={t('products.nameEn')}
                  value={values.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setValues((current) => ({
                      ...current,
                      name,
                      // Only auto-fill while creating: changing a live URL
                      // silently would break existing links.
                      slug: isNew ? slugify(name) : current.slug,
                    }));
                  }}
                  required
                  error={fields.name}
                />
              </div>
              <div className="sm:col-span-2">
                <TextField
                  label={t('products.nameTa')}
                  lang="ta"
                  value={values.nameTa}
                  onChange={(event) => set('nameTa', event.target.value)}
                  optionalLabel={t('common.optional')}
                  className="font-tamil"
                  error={fields.nameTa}
                />
              </div>
              <TextField
                label={t('products.brand')}
                value={values.brand}
                onChange={(event) => set('brand', event.target.value)}
                required
                error={fields.brand}
              />
              <SelectField
                label={t('products.category')}
                value={values.categoryId}
                onChange={(event) => set('categoryId', event.target.value)}
                required
                error={fields.categoryId}
              >
                <option value="">—</option>
                {assignable.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              <TextField
                label={t('products.sku')}
                value={values.sku}
                onChange={(event) => set('sku', event.target.value.toUpperCase())}
                required
                className="font-mono"
                error={fields.sku}
              />
              <TextField
                label={t('products.slug')}
                value={values.slug}
                onChange={(event) => set('slug', slugify(event.target.value))}
                required
                className="font-mono"
                hint={`/product/${values.slug || '…'}`}
                error={fields.slug}
              />
            </FieldGroup>
          </Panel>

          <Panel title={t('products.descriptionEn')}>
            <div className="space-y-4">
              <TextAreaField
                label={t('products.descriptionEn')}
                value={values.description}
                onChange={(event) => set('description', event.target.value)}
                rows={5}
                required
                error={fields.description}
              />
              <TextAreaField
                label={t('products.descriptionTa')}
                lang="ta"
                value={values.descriptionTa}
                onChange={(event) => set('descriptionTa', event.target.value)}
                rows={5}
                optionalLabel={t('common.optional')}
                className="font-tamil"
              />
              <TextField
                label={t('products.tags')}
                value={values.tags}
                onChange={(event) => set('tags', event.target.value)}
                hint={t('products.tagsHint')}
              />
            </div>
          </Panel>

          <Panel title={t('products.specs')}>
            <div className="space-y-2">
              {values.specs.map((spec, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={spec.key}
                    onChange={(event) => {
                      const next = [...values.specs];
                      next[index] = { ...next[index]!, key: event.target.value };
                      set('specs', next);
                    }}
                    placeholder="Output"
                    aria-label={`Specification ${index + 1} name`}
                    className="w-2/5 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <input
                    value={spec.value}
                    onChange={(event) => {
                      const next = [...values.specs];
                      next[index] = { ...next[index]!, value: event.target.value };
                      set('specs', next);
                    }}
                    placeholder="33W max"
                    aria-label={`Specification ${index + 1} value`}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      set('specs', values.specs.filter((_, position) => position !== index))
                    }
                    aria-label={`Remove specification ${index + 1}`}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-critical-50 hover:text-critical-600"
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => set('specs', [...values.specs, { key: '', value: '' }])}
              >
                <PlusIcon className="text-[1.1em]" />
                {t('products.addSpec')}
              </Button>
            </div>
          </Panel>

          <Panel title={t('products.images')}>
            {values.images.length > 0 ? (
              <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {values.images.map((image, index) => (
                  <li key={`${image.url}-${index}`} className="relative">
                    <Thumb url={image.url} alt={image.alt} size={112} rounded="lg" className="w-full" />
                    {index === 0 ? (
                      <span className="absolute left-1 top-1">
                        <Badge tone="brand">{t('products.primary')}</Badge>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...values.images];
                          const [moved] = next.splice(index, 1);
                          if (moved) next.unshift(moved);
                          set('images', next);
                        }}
                        className="absolute left-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white"
                      >
                        {t('products.setPrimary')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        set('images', values.images.filter((_, position) => position !== index))
                      }
                      aria-label={`Remove image ${index + 1}`}
                      className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-slate-900/70 text-white hover:bg-critical-500"
                    >
                      <CloseIcon className="text-xs" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400">
                {t('products.noImages')}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <label
                className={cn(
                  'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:border-slate-400',
                  uploading && 'pointer-events-none opacity-60',
                )}
              >
                <UploadIcon className="text-base" />
                {uploading ? t('common.saving') : t('products.uploadImage')}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile(file);
                    event.target.value = '';
                  }}
                />
              </label>

              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="/products/name-1.png"
                aria-label="Image URL"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <Button
                variant="outline"
                onClick={() => {
                  const url = imageUrl.trim();
                  if (!url) return;
                  set('images', [...values.images, { url, alt: values.name }]);
                  setImageUrl('');
                }}
              >
                {t('common.apply')}
              </Button>
            </div>
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 lg:sticky lg:top-20">
          <Panel title={t('common.price')}>
            <div className="space-y-4">
              <MoneyField
                label={t('products.mrp')}
                value={values.mrp}
                onChange={(event) => set('mrp', event.target.value)}
                required
                disabled={!canEditPrice}
                error={fields.mrp}
              />
              <MoneyField
                label={t('products.sellingPrice')}
                value={values.price}
                onChange={(event) => set('price', event.target.value)}
                required
                disabled={!canEditPrice}
                error={fields.price}
                aside={discount > 0 ? `${discount}% off` : undefined}
              />
              <MoneyField
                label={t('products.costPrice')}
                value={values.costPrice}
                onChange={(event) => set('costPrice', event.target.value)}
                hint={t('products.costPriceHint')}
                disabled={!canEditPrice}
                error={fields.costPrice}
              />
              {margin !== null ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-500">{t('products.margin')}: </span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      margin > 0 ? 'text-positive-600' : 'text-critical-600',
                    )}
                  >
                    {formatINR(rupeesToPaise(margin))} (
                    {Math.round((margin / Math.max(priceNumber, 1)) * 100)}%)
                  </span>
                </p>
              ) : null}
              <TextField
                label={t('products.tax')}
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={values.taxPercent}
                onChange={(event) => set('taxPercent', event.target.value)}
                aside="%"
                disabled={!canEditPrice}
              />
            </div>
          </Panel>

          <Panel title={t('products.stock')}>
            <div className="space-y-4">
              {isNew ? (
                <TextField
                  label={t('inventory.currentStock')}
                  type="number"
                  min={0}
                  value={values.stock}
                  onChange={(event) => set('stock', event.target.value)}
                  hint="Recorded as opening stock in the ledger."
                />
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  {t('inventory.currentStock')}:{' '}
                  <strong className="tabular-nums text-slate-900">{values.stock}</strong>
                  <Link
                    href={`/inventory/${initial.id}`}
                    className="ml-2 font-medium text-brand-700 hover:underline"
                  >
                    {t('inventory.adjust')} →
                  </Link>
                </p>
              )}
              <TextField
                label={t('products.lowStockThreshold')}
                type="number"
                min={0}
                value={values.lowStockThreshold}
                onChange={(event) => set('lowStockThreshold', event.target.value)}
              />
            </div>
          </Panel>

          <Panel title={t('common.status')}>
            <div className="space-y-3">
              <SelectField
                label={t('products.status')}
                value={values.status}
                onChange={(event) => set('status', event.target.value as ProductStatus)}
              >
                <option value="DRAFT">{t('productStatus.DRAFT')}</option>
                <option value="ACTIVE">{t('productStatus.ACTIVE')}</option>
                <option value="ARCHIVED">{t('productStatus.ARCHIVED')}</option>
              </SelectField>
              <CheckboxField
                label={t('products.featured')}
                checked={values.isFeatured}
                onChange={(event) => set('isFeatured', event.target.checked)}
              />
              <CheckboxField
                label={t('products.bestSeller')}
                checked={values.isBestSeller}
                onChange={(event) => set('isBestSeller', event.target.checked)}
              />
              <CheckboxField
                label={t('products.newArrival')}
                checked={values.isNewArrival}
                onChange={(event) => set('isNewArrival', event.target.checked)}
              />
            </div>
          </Panel>

          <Panel title={t('products.dimensions')}>
            <FieldGroup columns={2}>
              <TextField
                label={t('products.weight')}
                type="number"
                min={0}
                value={values.weightGrams}
                onChange={(event) => set('weightGrams', event.target.value)}
                optionalLabel={t('common.optional')}
              />
              <TextField
                label={t('products.length')}
                type="number"
                min={0}
                value={values.lengthMm}
                onChange={(event) => set('lengthMm', event.target.value)}
                optionalLabel={t('common.optional')}
              />
              <TextField
                label={t('products.width')}
                type="number"
                min={0}
                value={values.widthMm}
                onChange={(event) => set('widthMm', event.target.value)}
                optionalLabel={t('common.optional')}
              />
              <TextField
                label={t('products.height')}
                type="number"
                min={0}
                value={values.heightMm}
                onChange={(event) => set('heightMm', event.target.value)}
                optionalLabel={t('common.optional')}
              />
            </FieldGroup>
          </Panel>

          <div className="flex flex-col gap-2">
            <Button type="submit" size="lg" fullWidth loading={busy}>
              {isNew ? t('products.new') : t('common.save')}
            </Button>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              {t('common.cancel')}
            </Link>
            {!isNew && values.status === 'ACTIVE' ? (
              <a
                href={`${storefrontUrl}/product/${values.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
              >
                <ExternalIcon className="text-base" />
                {t('products.viewInShop')}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
