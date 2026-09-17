'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ProductStatus } from '@tamizh/db/enums';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import {
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  SpinnerIcon,
  TrashIcon,
} from '@/components/ui/Icons';
import { useNavigation } from '@/hooks/useNavigation';

/**
 * Per-row actions in the product table.
 *
 * Destructive and publishing actions each confirm first, and deletion asks for
 * the product name to be typed — a mis-tap in a dense table should not remove
 * a product.
 */
export function ProductRowActions({
  id,
  name,
  status,
  canDelete,
  canPublish,
  canCreate,
}: {
  id: string;
  name: string;
  status: ProductStatus;
  canDelete: boolean;
  canPublish: boolean;
  canCreate: boolean;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { push, refresh, pending } = useNavigation();
  const [busy, setBusy] = useState(false);
  // Which icon was pressed, so the spinner replaces that one and not all
  // three. Held until the refreshed list is on screen.
  const [acting, setActing] = useState<'publish' | 'duplicate' | 'remove' | null>(null);
  const working = busy || pending;
  const spinning = (kind: typeof acting) => working && acting === kind;

  const run = async (kind: NonNullable<typeof acting>, action: () => Promise<void>) => {
    if (!online) {
      toast(t('offline.blocked'), 'error');
      return;
    }
    setBusy(true);
    setActing(kind);
    try {
      await action();
      refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('error.saveFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = () =>
    run('publish', async () => {
      const next: ProductStatus = status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
      await api.patch(`/api/admin/products/${id}/status`, { status: next });
      toast(next === 'ACTIVE' ? t('products.updated') : t('products.updated'));
    });

  const duplicate = () =>
    run('duplicate', async () => {
      const copy = await api.post<{ id: string }>(`/api/admin/products/${id}/duplicate`);
      toast(t('products.duplicated'));
      push(`/products/${copy.id}`);
    });

  const remove = async () => {
    const confirmed = await confirm({
      title: t('products.deleteConfirm', { name }),
      body: t('products.archiveConfirm', { name }),
      confirmLabel: t('common.delete'),
      tone: 'danger',
      typeToConfirm: name.slice(0, 24),
    });
    if (!confirmed) return;
    await run('remove', async () => {
      const result = await api.delete<{ archived: boolean }>(`/api/admin/products/${id}`);
      toast(result.archived ? t('products.archived') : t('products.deleted'));
    });
  };

  return (
    <span className="flex items-center justify-end gap-0.5">
      <Link
        href={`/products/${id}`}
        className="rounded-md px-2 py-1.5 text-sm font-medium text-link hover:bg-success-50"
      >
        {t('common.edit')}
      </Link>

      {canPublish ? (
        <button
          type="button"
          onClick={togglePublish}
          disabled={working}
          aria-label={status === 'ACTIVE' ? t('products.unpublish') : t('products.publish')}
          title={status === 'ACTIVE' ? t('products.unpublish') : t('products.publish')}
          className="grid size-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          {spinning('publish') ? <SpinnerIcon /> : status === 'ACTIVE' ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      ) : null}

      {canCreate ? (
        <button
          type="button"
          onClick={duplicate}
          disabled={working}
          aria-label={t('products.duplicate')}
          title={t('products.duplicate')}
          className="grid size-9 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          {spinning('duplicate') ? <SpinnerIcon /> : <CopyIcon />}
        </button>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          onClick={remove}
          disabled={working}
          aria-label={`${t('common.delete')} ${name}`}
          title={t('common.delete')}
          className="grid size-9 place-items-center rounded-md text-slate-400 hover:bg-critical-50 hover:text-critical-600 disabled:opacity-50"
        >
          {spinning('remove') ? <SpinnerIcon className="text-critical-600" /> : <TrashIcon />}
        </button>
      ) : null}
    </span>
  );
}
