'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@tamizh/core/utils';
import type { CategoryFormValues } from '@/lib/category-form';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Panel } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import {
  CheckboxField,
  FieldGroup,
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/Field';

export function CategoryForm({
  initial,
  parents,
}: {
  initial: CategoryFormValues;
  /** Top-level categories only — the tree is two levels deep by design. */
  parents: { id: string; name: string }[];
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();

  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const isNew = !initial.id;

  const set = <K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) =>
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
      slug: values.slug,
      name: values.name,
      nameTa: values.nameTa,
      description: values.description,
      descriptionTa: values.descriptionTa,
      icon: values.icon,
      imageUrl: values.imageUrl,
      parentId: values.parentId || null,
      sortOrder: Number(values.sortOrder) || 0,
      isActive: values.isActive,
    };

    setBusy(true);
    try {
      if (isNew) {
        await api.post('/api/admin/categories', payload);
        toast(t('categories.created'));
      } else {
        await api.put(`/api/admin/categories/${initial.id}`, payload);
        toast(t('categories.updated'));
      }
      router.push('/categories');
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

  return (
    <form onSubmit={submit} noValidate className="max-w-2xl space-y-5">
      {error ? <FormError>{error}</FormError> : null}

      <Panel>
        <FieldGroup columns={2}>
          <TextField
            label={t('products.nameEn')}
            value={values.name}
            onChange={(event) => {
              const name = event.target.value;
              setValues((current) => ({
                ...current,
                name,
                slug: isNew ? slugify(name) : current.slug,
              }));
            }}
            required
            error={fields.name}
          />
          <TextField
            label={t('products.nameTa')}
            lang="ta"
            className="font-tamil"
            value={values.nameTa}
            onChange={(event) => set('nameTa', event.target.value)}
            required
            error={fields.nameTa}
          />
          <TextField
            label={t('categories.slug')}
            value={values.slug}
            onChange={(event) => set('slug', slugify(event.target.value))}
            required
            className="font-mono"
            hint={`/category/${values.slug || '…'}`}
            error={fields.slug}
          />
          <SelectField
            label={t('categories.parent')}
            value={values.parentId}
            onChange={(event) => set('parentId', event.target.value)}
            error={fields.parentId}
            hint={t('categories.hiddenHint')}
          >
            <option value="">{t('categories.topLevel')}</option>
            {parents
              .filter((parent) => parent.id !== initial.id)
              .map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
          </SelectField>
          <TextField
            label={t('categories.icon')}
            value={values.icon}
            onChange={(event) => set('icon', event.target.value)}
            optionalLabel={t('common.optional')}
            hint={t('categories.iconHint')}
          />
          <TextField
            label={t('categories.image')}
            value={values.imageUrl}
            onChange={(event) => set('imageUrl', event.target.value)}
            optionalLabel={t('common.optional')}
            placeholder="/categories/mobiles.png"
            className="font-mono"
          />
          <div className="sm:col-span-2">
            <TextAreaField
              label={t('categories.description')}
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              rows={3}
              optionalLabel={t('common.optional')}
            />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              label={t('categories.descriptionTa')}
              lang="ta"
              className="font-tamil"
              value={values.descriptionTa}
              onChange={(event) => set('descriptionTa', event.target.value)}
              rows={3}
              optionalLabel={t('common.optional')}
            />
          </div>
          <TextField
            label={t('categories.order')}
            type="number"
            min={0}
            value={values.sortOrder}
            onChange={(event) => set('sortOrder', event.target.value)}
          />
          <div className="flex items-end pb-2.5">
            <CheckboxField
              label={t('categories.shown')}
              description={t('categories.hiddenHint')}
              checked={values.isActive}
              onChange={(event) => set('isActive', event.target.checked)}
            />
          </div>
        </FieldGroup>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {isNew ? t('common.create') : t('common.save')}
        </Button>
        <Link
          href="/categories"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:border-slate-400"
        >
          {t('common.cancel')}
        </Link>
      </div>
    </form>
  );
}
