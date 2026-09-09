'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatINR, paiseToRupees } from '@tamizh/core/money';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Primitives';
import {
  CheckboxField,
  FieldGroup,
  FormError,
  MoneyField,
  TextField,
} from '@/components/ui/Field';
import { PlusIcon, TrashIcon, EditIcon } from '@/components/ui/Icons';

/**
 * Delivery zones.
 *
 * A zone overrides the standard delivery charge and delivery estimate for the
 * PIN codes it covers, and can switch cash on delivery off where the shop
 * would rather not offer it. Editing happens inline: a separate page for four
 * fields would be more navigation than content.
 */

export interface ZoneRow {
  id: string;
  name: string;
  pincodePrefixes: string[];
  /** Paise, or null to fall back to the shop default. */
  shippingFee: number | null;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  codAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface Draft {
  id: string | null;
  name: string;
  prefixes: string;
  fee: string;
  minDays: string;
  maxDays: string;
  cod: boolean;
  active: boolean;
}

function draftFrom(zone: ZoneRow): Draft {
  return {
    id: zone.id,
    name: zone.name,
    prefixes: zone.pincodePrefixes.join(', '),
    fee: zone.shippingFee === null ? '' : String(paiseToRupees(zone.shippingFee)),
    minDays: String(zone.minDeliveryDays),
    maxDays: String(zone.maxDeliveryDays),
    cod: zone.codAvailable,
    active: zone.isActive,
  };
}

const blank: Draft = {
  id: null,
  name: '',
  prefixes: '',
  fee: '',
  minDays: '2',
  maxDays: '5',
  cod: true,
  active: true,
};

export function ShippingZones({
  zones,
  canManage,
}: {
  zones: ZoneRow[];
  canManage: boolean;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft) return;
    setError(null);

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }

    const payload = {
      name: draft.name,
      pincodePrefixes: draft.prefixes
        .split(',')
        .map((prefix) => prefix.trim())
        .filter(Boolean),
      shippingFee: draft.fee === '' ? null : Number(draft.fee),
      minDeliveryDays: Number(draft.minDays) || 0,
      maxDeliveryDays: Number(draft.maxDays) || 0,
      codAvailable: draft.cod,
      isActive: draft.active,
      sortOrder: 0,
    };

    setBusy(true);
    try {
      if (draft.id) await api.put(`/api/admin/shipping/${draft.id}`, payload);
      else await api.post('/api/admin/shipping', payload);
      toast(t('settings.zoneSaved'));
      setDraft(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (zone: ZoneRow) => {
    const confirmed = await confirm({
      title: t('settings.zoneDeleteConfirm', { name: zone.name }),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/shipping/${zone.id}`);
      toast(t('settings.zoneDeleted'));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    }
  };

  return (
    <div className="space-y-4">
      {error ? <FormError>{error}</FormError> : null}

      {zones.length === 0 && !draft ? (
        <p className="text-sm text-slate-500">{t('settings.noZones')}</p>
      ) : null}

      <ul className="space-y-2">
        {zones.map((zone) => (
          <li
            key={zone.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-200 px-3 py-2.5"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{zone.name}</span>
                {!zone.isActive ? (
                  <Badge tone="neutral">{t('categories.hidden')}</Badge>
                ) : null}
                {!zone.codAvailable ? <Badge tone="caution">No COD</Badge> : null}
              </span>
              <span className="block font-mono text-xs text-slate-500">
                {zone.pincodePrefixes.join(', ') || '—'}
              </span>
            </span>

            <span className="text-sm tabular-nums text-slate-600">
              {zone.shippingFee === null ? '—' : formatINR(zone.shippingFee)}
            </span>
            <span className="text-sm tabular-nums text-slate-500">
              {zone.minDeliveryDays}–{zone.maxDeliveryDays} {t('settings.days')}
            </span>

            {canManage ? (
              <span className="flex gap-0.5">
                <button
                  type="button"
                  onClick={() => setDraft(draftFrom(zone))}
                  aria-label={`${t('common.edit')}: ${zone.name}`}
                  className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(zone)}
                  aria-label={`${t('common.delete')}: ${zone.name}`}
                  className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-critical-50 hover:text-critical-600"
                >
                  <TrashIcon />
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {draft ? (
        <div className="space-y-4 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
          <FieldGroup columns={2}>
            <TextField
              label={t('settings.zoneName')}
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              required
            />
            <TextField
              label={t('settings.zonePrefixes')}
              value={draft.prefixes}
              onChange={(event) => setDraft({ ...draft, prefixes: event.target.value })}
              hint={t('settings.zonePrefixesHint')}
              className="font-mono"
            />
            <MoneyField
              label={t('settings.zoneFee')}
              value={draft.fee}
              onChange={(event) => setDraft({ ...draft, fee: event.target.value })}
              optionalLabel={t('common.optional')}
              hint={t('settings.zoneFeeHint')}
            />
            <div className="flex gap-2">
              <TextField
                label={t('settings.zoneDays')}
                type="number"
                min={0}
                value={draft.minDays}
                onChange={(event) => setDraft({ ...draft, minDays: event.target.value })}
              />
              <TextField
                label="→"
                type="number"
                min={0}
                value={draft.maxDays}
                onChange={(event) => setDraft({ ...draft, maxDays: event.target.value })}
              />
            </div>
          </FieldGroup>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <CheckboxField
              label={t('settings.zoneCod')}
              checked={draft.cod}
              onChange={(event) => setDraft({ ...draft, cod: event.target.checked })}
            />
            <CheckboxField
              label={t('categories.active')}
              checked={draft.active}
              onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" loading={busy} onClick={() => void save()}>
              {t('common.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : canManage ? (
        <Button variant="outline" size="sm" onClick={() => setDraft(blank)}>
          <PlusIcon className="text-[1.1em]" />
          {t('settings.newZone')}
        </Button>
      ) : null}
    </div>
  );
}
