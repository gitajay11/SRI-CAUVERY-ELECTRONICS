'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@tamizh/core/utils';
import { ApiError, api } from '@/lib/http';
import type { CategoryNode } from '@/services/categories';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { Badge, Alert } from '@/components/ui/Primitives';
import { Thumb } from '@/components/ui/Thumb';
import { useNavigation } from '@/hooks/useNavigation';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  SpinnerIcon,
  TrashIcon,
} from '@/components/ui/Icons';

/**
 * The category tree, with reordering.
 *
 * Order is changed with move up/down buttons rather than drag-and-drop: this
 * is used on a phone as often as a desktop, buttons work with a keyboard and a
 * screen reader, and there is no library to ship. Moves are staged locally and
 * written in one request, so a half-applied order never reaches the shop.
 */

interface Props {
  tree: CategoryNode[];
  canManage: boolean;
}

export function CategoryTree({ tree, canManage }: Props) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { refresh, pending } = useNavigation();

  const [nodes, setNodes] = useState(tree);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  // Which node an action is working on, and which action, so the icon that
  // was pressed spins — and nothing else can be pressed — until the
  // refreshed tree is on screen.
  const [acting, setActing] = useState<{ id: string; kind: 'toggle' | 'remove' } | null>(null);
  const working = busy || pending;
  const [error, setError] = useState<string | null>(null);

  const move = (parentId: string | null, index: number, direction: -1 | 1) => {
    setNodes((current) => {
      const swap = (list: CategoryNode[]) => {
        const target = index + direction;
        if (target < 0 || target >= list.length) return list;
        const next = [...list];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved!);
        return next;
      };

      if (parentId === null) return swap(current);
      return current.map((node) =>
        node.id === parentId ? { ...node, children: swap(node.children) } : node,
      );
    });
    setDirty(true);
    setError(null);
  };

  const saveOrder = async () => {
    setBusy(true);
    setError(null);
    try {
      const order: { id: string; sortOrder: number }[] = [];
      nodes.forEach((node, index) => {
        order.push({ id: node.id, sortOrder: index });
        node.children.forEach((child, childIndex) =>
          order.push({ id: child.id, sortOrder: childIndex }),
        );
      });
      await api.post('/api/admin/categories/reorder', { order });
      setDirty(false);
      toast(t('categories.reordered'));
      refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (node: CategoryNode) => {
    setError(null);
    setBusy(true);
    setActing({ id: node.id, kind: 'toggle' });
    try {
      await api.patch(`/api/admin/categories/${node.id}`, { isActive: !node.isActive });
      toast(node.isActive ? t('categories.hidden') : t('categories.shown'));
      refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (node: CategoryNode) => {
    const confirmed = await confirm({
      title: t('categories.deleteConfirm', { name: node.name }),
      body:
        node.productCount > 0
          ? t('categories.hasProducts', { count: node.productCount })
          : undefined,
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;

    setError(null);
    setBusy(true);
    setActing({ id: node.id, kind: 'remove' });
    try {
      await api.delete(`/api/admin/categories/${node.id}`);
      toast(t('categories.deleted'));
      refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const row = (node: CategoryNode, index: number, siblings: number, parentId: string | null) => (
    <li key={node.id} className={cn(parentId ? 'ps-4 sm:ps-10' : '')}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 sm:px-4">
        <Thumb url={node.imageUrl} size={parentId ? 32 : 40} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <Link
                href={`/categories/${node.id}`}
                className="truncate font-medium text-slate-900 hover:text-link hover:underline"
              >
                {node.name}
              </Link>
            ) : (
              <span className="truncate font-medium text-slate-900">{node.name}</span>
            )}
            {!node.isActive ? <Badge tone="neutral">{t('categories.hidden')}</Badge> : null}
          </div>
          <p className="truncate text-xs text-slate-500">
            <span lang="ta" className="font-tamil">
              {node.nameTa}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="font-mono">/{node.slug}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            {t('categories.productCount', { count: node.productCount })}
          </p>
        </div>

        {canManage ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => move(parentId, index, -1)}
              disabled={index === 0}
              aria-label={`${t('categories.moveUp')}: ${node.name}`}
              className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowUpIcon />
            </button>
            <button
              type="button"
              onClick={() => move(parentId, index, 1)}
              disabled={index === siblings - 1}
              aria-label={`${t('categories.moveDown')}: ${node.name}`}
              className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowDownIcon />
            </button>
            <button
              type="button"
              onClick={() => void toggle(node)}
              disabled={!online || working}
              aria-label={`${node.isActive ? t('common.no') : t('common.yes')}: ${node.name}`}
              title={node.isActive ? t('categories.hidden') : t('categories.shown')}
              className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            >
              {working && acting?.id === node.id && acting.kind === 'toggle' ? (
                <SpinnerIcon />
              ) : node.isActive ? (
                <EyeIcon />
              ) : (
                <EyeOffIcon />
              )}
            </button>
            <button
              type="button"
              onClick={() => void remove(node)}
              disabled={!online || working}
              aria-label={`${t('common.delete')}: ${node.name}`}
              className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-critical-50 hover:text-critical-600 disabled:opacity-40"
            >
              {working && acting?.id === node.id && acting.kind === 'remove' ? (
                <SpinnerIcon className="text-critical-600" />
              ) : (
                <TrashIcon />
              )}
            </button>
          </div>
        ) : null}
      </div>

      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child, childIndex) =>
            row(child, childIndex, node.children.length, node.id),
          )}
        </ul>
      ) : null}
    </li>
  );

  return (
    <div>
      {error ? (
        <Alert tone="critical" className="mb-3">
          {error}
        </Alert>
      ) : null}

      {dirty ? (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-caution-100 bg-caution-50 px-3.5 py-2.5">
          <p className="text-sm font-medium text-caution-600">{t('categories.reorderHint')}</p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNodes(tree);
                setDirty(false);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button size="sm" loading={busy || pending} onClick={() => void saveOrder()}>
              {t('categories.saveOrder')}
            </Button>
          </div>
        </div>
      ) : null}

      <ul>{nodes.map((node, index) => row(node, index, nodes.length, null))}</ul>
    </div>
  );
}
