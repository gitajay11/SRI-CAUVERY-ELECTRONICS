'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import { EditIcon, SpinnerIcon, TrashIcon } from '@/components/ui/Icons';
import { useNavigation } from '@/hooks/useNavigation';

/** Edit and delete for one coupon row. */
export function CouponRowActions({ id, code }: { id: string; code: string }) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { refresh, pending } = useNavigation();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    const confirmed = await confirm({
      title: t('coupons.deleteConfirm', { code }),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const result = await api.delete<{ deactivated: boolean }>(`/api/admin/coupons/${id}`);
      toast(result.deactivated ? t('coupons.deactivated') : t('coupons.deleted'));
      refresh();
    } catch (caught) {
      toast(
        caught instanceof ApiError ? caught.message : t('error.saveFailed'),
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="flex items-center justify-end gap-0.5">
      <Link
        href={`/coupons/${id}`}
        aria-label={`${t('common.edit')}: ${code}`}
        className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <EditIcon />
      </Link>
      <button
        type="button"
        onClick={() => void remove()}
        disabled={!online || busy || pending}
        aria-label={`${t('common.delete')}: ${code}`}
        className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-critical-50 hover:text-critical-600 disabled:opacity-40"
      >
        {busy || pending ? <SpinnerIcon className="text-critical-600" /> : <TrashIcon />}
      </button>
    </span>
  );
}
