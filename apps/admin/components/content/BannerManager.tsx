'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api } from '@/lib/http';
import type { TranslationKey } from '@/i18n';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { Badge, Panel } from '@/components/ui/Primitives';
import { Thumb } from '@/components/ui/Thumb';
import {
  CheckboxField,
  FieldGroup,
  FormError,
  SelectField,
  TextField,
} from '@/components/ui/Field';
import { PlusIcon, EditIcon, TrashIcon, ExternalIcon } from '@/components/ui/Icons';

/**
 * Homepage content.
 *
 * Everything a shopper reads above the fold is edited here rather than in code:
 * the hero, the promotional strip, the announcement bar. Both languages sit
 * side by side, because a banner that exists only in English is how a bilingual
 * shop quietly becomes an English one.
 */

type Placement = 'HERO' | 'PROMO_STRIP' | 'CATEGORY_FEATURE' | 'ANNOUNCEMENT';

export interface BannerRow {
  id: string;
  placement: Placement;
  title: string;
  titleTa: string;
  subtitle: string;
  subtitleTa: string;
  imageUrl: string;
  ctaLabel: string;
  ctaLabelTa: string;
  ctaHref: string;
  isActive: boolean;
  sortOrder: number;
  startsAt: string;
  endsAt: string;
}

const PLACEMENT_LABELS: Record<Placement, TranslationKey> = {
  HERO: 'content.placement.HERO',
  PROMO_STRIP: 'content.placement.PROMO_STRIP',
  CATEGORY_FEATURE: 'content.placement.CATEGORY_FEATURE',
  ANNOUNCEMENT: 'content.placement.ANNOUNCEMENT',
};

const blank = (): BannerRow => ({
  id: '',
  placement: 'HERO',
  title: '',
  titleTa: '',
  subtitle: '',
  subtitleTa: '',
  imageUrl: '',
  ctaLabel: '',
  ctaLabelTa: '',
  ctaHref: '',
  isActive: true,
  sortOrder: 0,
  startsAt: '',
  endsAt: '',
});

export function BannerManager({
  banners,
  storefrontUrl,
}: {
  banners: BannerRow[];
  storefrontUrl: string;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const [draft, setDraft] = useState<BannerRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const set = <K extends keyof BannerRow>(key: K, value: BannerRow[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    if (!draft) return;
    setError(null);
    setFields({});

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }

    const payload = {
      placement: draft.placement,
      title: draft.title,
      titleTa: draft.titleTa,
      subtitle: draft.subtitle,
      subtitleTa: draft.subtitleTa,
      imageUrl: draft.imageUrl,
      ctaLabel: draft.ctaLabel,
      ctaLabelTa: draft.ctaLabelTa,
      ctaHref: draft.ctaHref,
      isActive: draft.isActive,
      sortOrder: Number(draft.sortOrder) || 0,
      startsAt: draft.startsAt || null,
      endsAt: draft.endsAt || null,
    };

    setBusy(true);
    try {
      if (draft.id) await api.put(`/api/admin/banners/${draft.id}`, payload);
      else await api.post('/api/admin/banners', payload);
      toast(t('content.saved'));
      setDraft(null);
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

  const remove = async (banner: BannerRow) => {
    const confirmed = await confirm({
      title: t('content.deleteConfirm', { title: banner.title }),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/banners/${banner.id}`);
      toast(t('content.deleted'));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    }
  };

  return (
    <div className="space-y-4">
      {error ? <FormError>{error}</FormError> : null}

      <ul className="space-y-2">
        {banners.map((banner) => (
          <li
            key={banner.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-panel border border-slate-200 bg-surface px-3 py-2.5"
          >
            <Thumb url={banner.imageUrl} size={48} rounded="lg" />

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{banner.title}</span>
                <Badge tone="info">{t(PLACEMENT_LABELS[banner.placement])}</Badge>
                {!banner.isActive ? (
                  <Badge tone="neutral">{t('categories.hidden')}</Badge>
                ) : null}
              </span>
              {banner.titleTa ? (
                <span lang="ta" className="block font-tamil text-sm text-slate-600">
                  {banner.titleTa}
                </span>
              ) : (
                <span className="block text-xs text-caution-600">
                  {t('content.missingTamil')}
                </span>
              )}
              {banner.subtitle ? (
                <span className="block text-xs text-slate-500">{banner.subtitle}</span>
              ) : null}
            </span>

            <span className="flex gap-0.5">
              <button
                type="button"
                onClick={() => setDraft(banner)}
                aria-label={`${t('common.edit')}: ${banner.title}`}
                className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={() => void remove(banner)}
                aria-label={`${t('common.delete')}: ${banner.title}`}
                className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-critical-50 hover:text-critical-600"
              >
                <TrashIcon />
              </button>
            </span>
          </li>
        ))}
      </ul>

      {draft ? (
        <Panel title={draft.id ? t('content.edit') : t('content.new')}>
          <div className="space-y-4">
            <FieldGroup columns={2}>
              <SelectField
                label={t('content.placement')}
                value={draft.placement}
                onChange={(event) => set('placement', event.target.value as Placement)}
              >
                {(Object.keys(PLACEMENT_LABELS) as Placement[]).map((placement) => (
                  <option key={placement} value={placement}>
                    {t(PLACEMENT_LABELS[placement])}
                  </option>
                ))}
              </SelectField>
              <TextField
                label={t('categories.order')}
                type="number"
                min={0}
                value={String(draft.sortOrder)}
                onChange={(event) => set('sortOrder', Number(event.target.value) || 0)}
              />
              <TextField
                label={t('content.headline')}
                value={draft.title}
                onChange={(event) => set('title', event.target.value)}
                required
                error={fields.title}
              />
              <TextField
                label={t('content.headlineTa')}
                lang="ta"
                className="font-tamil"
                value={draft.titleTa}
                onChange={(event) => set('titleTa', event.target.value)}
              />
              <TextField
                label={t('content.subtitle')}
                value={draft.subtitle}
                onChange={(event) => set('subtitle', event.target.value)}
                optionalLabel={t('common.optional')}
              />
              <TextField
                label={t('content.subtitleTa')}
                lang="ta"
                className="font-tamil"
                value={draft.subtitleTa}
                onChange={(event) => set('subtitleTa', event.target.value)}
                optionalLabel={t('common.optional')}
              />
              <TextField
                label={t('content.image')}
                value={draft.imageUrl}
                onChange={(event) => set('imageUrl', event.target.value)}
                className="font-mono"
                placeholder="/brand/hero.png"
                optionalLabel={t('common.optional')}
              />
              <TextField
                label={t('content.link')}
                value={draft.ctaHref}
                onChange={(event) => set('ctaHref', event.target.value)}
                className="font-mono"
                placeholder="/shop?category=mobiles"
                optionalLabel={t('common.optional')}
              />
              <TextField
                label={t('content.buttonLabel')}
                value={draft.ctaLabel}
                onChange={(event) => set('ctaLabel', event.target.value)}
                optionalLabel={t('common.optional')}
              />
              <TextField
                label={t('content.buttonLabelTa')}
                lang="ta"
                className="font-tamil"
                value={draft.ctaLabelTa}
                onChange={(event) => set('ctaLabelTa', event.target.value)}
                optionalLabel={t('common.optional')}
              />
              <TextField
                label={t('coupons.startsAt')}
                type="date"
                value={draft.startsAt}
                onChange={(event) => set('startsAt', event.target.value)}
                optionalLabel={t('common.optional')}
              />
              <TextField
                label={t('coupons.endsAt')}
                type="date"
                value={draft.endsAt}
                onChange={(event) => set('endsAt', event.target.value)}
                optionalLabel={t('common.optional')}
              />
            </FieldGroup>

            <CheckboxField
              label={t('categories.active')}
              checked={draft.isActive}
              onChange={(event) => set('isActive', event.target.checked)}
            />

            <div className="flex flex-wrap gap-2">
              <Button loading={busy} onClick={() => void save()}>
                {t('common.save')}
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                {t('common.cancel')}
              </Button>
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 self-center text-sm font-medium text-link hover:underline"
              >
                <ExternalIcon className="text-base" />
                {t('content.preview')}
              </a>
            </div>
          </div>
        </Panel>
      ) : (
        <Button variant="outline" onClick={() => setDraft(blank())}>
          <PlusIcon className="text-[1.1em]" />
          {t('content.new')}
        </Button>
      )}
    </div>
  );
}
