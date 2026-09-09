'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StaffRole } from '@tamizh/db/enums';
import { PERMISSIONS, ROLE_LABELS, type Permission } from '@tamizh/core/permissions';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { FormError, SelectField } from '@/components/ui/Field';

/**
 * What each role may do.
 *
 * Grouped by the part of the shop a permission touches, because "can this
 * person issue refunds?" is a question about money, not about a dotted string.
 * The owner role is absent by design: it always holds everything, which is what
 * makes it possible to undo a mistake made here.
 */

const GROUPS: { title: string; match: (key: string) => boolean }[] = [
  { title: 'Dashboard and reports', match: (k) => /^(dashboard|reports|analytics)\./.test(k) },
  { title: 'Catalogue', match: (k) => /^(products|categories)\./.test(k) },
  { title: 'Inventory', match: (k) => k.startsWith('inventory.') },
  { title: 'Orders', match: (k) => k.startsWith('orders.') },
  { title: 'Money', match: (k) => /^(payments|refunds|returns)\./.test(k) },
  { title: 'Customers and marketing', match: (k) => /^(customers|coupons|reviews|content)\./.test(k) },
  { title: 'Administration', match: (k) => /^(settings|shipping|staff|roles|audit|notifications)\./.test(k) },
];

export function RoleMatrix({
  matrix,
  locale,
}: {
  /** Role → permission → allowed, as stored. Missing keys fall back to the default matrix. */
  matrix: Record<string, Record<string, boolean>>;
  locale: 'en' | 'ta';
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();

  const editable: StaffRole[] = [
    'ADMIN',
    'MANAGER',
    'INVENTORY_MANAGER',
    'ORDER_MANAGER',
    'SUPPORT_STAFF',
  ];

  const [role, setRole] = useState<StaffRole>('MANAGER');
  const [granted, setGranted] = useState<Set<string>>(
    () => new Set(Object.entries(matrix.MANAGER ?? {}).filter(([, on]) => on).map(([key]) => key)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseRole = (next: StaffRole) => {
    setRole(next);
    setGranted(
      new Set(
        Object.entries(matrix[next] ?? {})
          .filter(([, on]) => on)
          .map(([key]) => key),
      ),
    );
    setError(null);
  };

  const toggle = (permission: string) => {
    setGranted((current) => {
      const next = new Set(current);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  };

  const save = async () => {
    setError(null);
    if (!online) {
      setError(t('offline.blocked'));
      return;
    }

    setBusy(true);
    try {
      await api.put('/api/admin/roles', { role, permissions: [...granted] });
      toast(t('staff.roleSaved'));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const keys = Object.keys(PERMISSIONS) as Permission[];

  return (
    <div className="space-y-4">
      {error ? <FormError>{error}</FormError> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-xs">
          <SelectField
            label={t('staff.selectRole')}
            value={role}
            onChange={(event) => chooseRole(event.target.value as StaffRole)}
          >
            {editable.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]?.[locale] ?? value}
              </option>
            ))}
          </SelectField>
        </div>
        <p className="text-sm text-slate-500">
          {t('staff.permissionCount', { count: granted.size, total: keys.length })}
        </p>
      </div>

      <div className="space-y-4">
        {GROUPS.map((group) => {
          const members = keys.filter((key) => group.match(key));
          if (members.length === 0) return null;
          return (
            <fieldset key={group.title}>
              <legend className="mb-2 text-sm font-semibold text-slate-900">
                {group.title}
              </legend>
              <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {members.map((permission) => {
                  const id = `perm-${permission}`;
                  return (
                    <li key={permission} className="flex items-start gap-2.5">
                      <input
                        id={id}
                        type="checkbox"
                        checked={granted.has(permission)}
                        onChange={() => toggle(permission)}
                        className="mt-0.5 size-4.5 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600"
                      />
                      <label htmlFor={id} className="cursor-pointer text-sm text-slate-700">
                        {PERMISSIONS[permission]}
                        <span className="block font-mono text-[0.7rem] text-slate-400">
                          {permission}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button loading={busy} disabled={!online} onClick={() => void save()}>
          {t('common.save')}
        </Button>
        <p className="text-xs text-slate-400">{t('staff.rolesHint')}</p>
      </div>
    </div>
  );
}
