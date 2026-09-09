'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StaffRole } from '@tamizh/db/enums';
import { formatDate } from '@tamizh/core/utils';
import { ROLE_LABELS } from '@tamizh/core/permissions';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useConfirm, useToast } from '@/components/providers/AdminProviders';
import { Button } from '@/components/ui/Button';
import { Badge, Alert } from '@/components/ui/Primitives';
import {
  CheckboxField,
  FieldGroup,
  FormError,
  SelectField,
  TextField,
} from '@/components/ui/Field';
import { PlusIcon, KeyIcon, EditIcon, TrashIcon, CopyIcon } from '@/components/ui/Icons';

/**
 * Staff accounts.
 *
 * A one-time password appears exactly once, when an account is created or
 * reset — there is nowhere to look it up afterwards, because only a hash is
 * stored. The panel says so plainly rather than letting someone assume they
 * can come back for it.
 */

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  sessions: number;
}

interface Draft {
  id: string | null;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  isActive: boolean;
}

export function StaffManager({
  staff,
  assignable,
  currentUserId,
  locale,
}: {
  staff: StaffMember[];
  /** Roles this administrator is allowed to hand out. */
  assignable: StaffRole[];
  currentUserId: string;
  locale: 'en' | 'ta';
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const roleLabel = (role: StaffRole) => ROLE_LABELS[role]?.[locale] ?? role;

  const save = async () => {
    if (!draft) return;
    setError(null);
    setFields({});

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }

    const payload = {
      name: draft.name,
      email: draft.email,
      phone: draft.phone,
      role: draft.role,
      isActive: draft.isActive,
      permissionOverrides: { allow: [], deny: [] },
    };

    setBusy(true);
    try {
      if (draft.id) {
        const result = await api.put<{ sessionsEnded: boolean }>(
          `/api/admin/staff/${draft.id}`,
          payload,
        );
        toast(
          result.sessionsEnded ? t('staff.updatedSessionsEnded') : t('staff.updated'),
        );
      } else {
        const result = await api.post<{ temporaryPassword: string }>(
          '/api/admin/staff',
          payload,
        );
        setIssued({ name: draft.name, password: result.temporaryPassword });
        toast(t('staff.created'));
      }
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

  const resetPassword = async (member: StaffMember) => {
    const confirmed = await confirm({
      title: t('staff.resetConfirm', { name: member.name }),
      body: t('staff.resetHint'),
      confirmLabel: t('staff.resetPassword'),
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      const result = await api.post<{ temporaryPassword: string }>(
        `/api/admin/staff/${member.id}/password`,
      );
      setIssued({ name: member.name, password: result.temporaryPassword });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    }
  };

  const remove = async (member: StaffMember) => {
    const confirmed = await confirm({
      title: t('staff.removeConfirm', { name: member.name }),
      confirmLabel: t('common.delete'),
      tone: 'danger',
      typeToConfirm: member.email,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/staff/${member.id}`);
      toast(t('staff.removed'));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
    }
  };

  return (
    <div className="space-y-4">
      {error ? <FormError>{error}</FormError> : null}

      {issued ? (
        <Alert tone="caution" title={t('staff.oneTimePassword', { name: issued.name })}>
          <p className="mb-2">{t('staff.oneTimePasswordHint')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded border border-caution-100 bg-surface px-3 py-1.5 font-mono text-base font-semibold text-slate-900">
              {issued.password}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(issued.password);
                toast(t('common.copied'));
              }}
            >
              <CopyIcon className="text-[1.05em]" />
              {t('common.copy')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIssued(null)}>
              {t('common.close')}
            </Button>
          </div>
        </Alert>
      ) : null}

      <ul className="divide-y divide-slate-100 rounded-panel border border-slate-200 bg-surface">
        {staff.map((member) => (
          <li
            key={member.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{member.name}</span>
                <Badge tone={member.isActive ? 'brand' : 'neutral'}>
                  {roleLabel(member.role)}
                </Badge>
                {!member.isActive ? (
                  <Badge tone="critical">{t('staff.disabled')}</Badge>
                ) : null}
                {member.mustChangePassword ? (
                  <Badge tone="caution">{t('staff.mustChange')}</Badge>
                ) : null}
                {member.id === currentUserId ? (
                  <Badge tone="info">{t('staff.you')}</Badge>
                ) : null}
              </span>
              <span className="block text-xs text-slate-500">
                {member.email}
                {member.phone ? ` · ${member.phone}` : ''}
              </span>
              <span className="block text-xs text-slate-400">
                {member.lastLoginAt
                  ? `${t('staff.lastLogin')} ${formatDate(member.lastLoginAt, true)}`
                  : t('staff.neverSignedIn')}
                {member.sessions > 0
                  ? ` · ${t('staff.openSessions', { count: member.sessions })}`
                  : ''}
              </span>
            </span>

            <span className="flex gap-0.5">
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    id: member.id,
                    name: member.name,
                    email: member.email,
                    phone: member.phone ?? '',
                    role: member.role,
                    isActive: member.isActive,
                  })
                }
                aria-label={`${t('common.edit')}: ${member.name}`}
                className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={() => void resetPassword(member)}
                disabled={!online}
                aria-label={`${t('staff.resetPassword')}: ${member.name}`}
                className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <KeyIcon />
              </button>
              <button
                type="button"
                onClick={() => void remove(member)}
                disabled={!online || member.id === currentUserId}
                aria-label={`${t('common.delete')}: ${member.name}`}
                className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-critical-50 hover:text-critical-600 disabled:opacity-30"
              >
                <TrashIcon />
              </button>
            </span>
          </li>
        ))}
      </ul>

      {draft ? (
        <div className="space-y-4 rounded-panel border border-action-edge/40 bg-success-50/40 p-4">
          <FieldGroup columns={2}>
            <TextField
              label={t('common.name')}
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              required
              error={fields.name}
            />
            <TextField
              label={t('common.email')}
              type="email"
              value={draft.email}
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              required
              error={fields.email}
            />
            <TextField
              label={t('common.phone')}
              value={draft.phone}
              onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              optionalLabel={t('common.optional')}
            />
            <SelectField
              label={t('staff.role')}
              value={draft.role}
              onChange={(event) =>
                setDraft({ ...draft, role: event.target.value as StaffRole })
              }
              error={fields.role}
              disabled={draft.id === currentUserId}
              hint={draft.id === currentUserId ? t('staff.cannotChangeOwnRole') : undefined}
            >
              {assignable.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </SelectField>
          </FieldGroup>

          <CheckboxField
            label={t('staff.active')}
            description={t('staff.activeHint')}
            checked={draft.isActive}
            onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
            disabled={draft.id === currentUserId}
          />

          <div className="flex gap-2">
            <Button size="sm" loading={busy} onClick={() => void save()}>
              {draft.id ? t('common.save') : t('staff.new')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() =>
            setDraft({
              id: null,
              name: '',
              email: '',
              phone: '',
              role: assignable[assignable.length - 1] ?? 'SUPPORT_STAFF',
              isActive: true,
            })
          }
        >
          <PlusIcon className="text-[1.1em]" />
          {t('staff.new')}
        </Button>
      )}
    </div>
  );
}
