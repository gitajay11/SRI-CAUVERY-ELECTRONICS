'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@tamizh/core/utils';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Panel } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { FormError, TextAreaField } from '@/components/ui/Field';

/**
 * Staff-only notes on an order.
 *
 * Never shown to the customer, and the panel says so — otherwise someone will
 * eventually write something here assuming the buyer can read it.
 */
export function OrderNotes({
  orderNumber,
  notes,
}: {
  orderNumber: string;
  notes: { id: string; body: string; author: string; createdAt: string }[];
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Panel title={t('orders.internalNotes')} description={t('orders.internalNotesHint')}>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          if (!online) {
            setError(t('offline.blocked'));
            return;
          }
          setBusy(true);
          try {
            await api.post(`/api/admin/orders/${encodeURIComponent(orderNumber)}/notes`, {
              body,
            });
            toast(t('orders.noteAdded'));
            setBody('');
            router.refresh();
          } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : t('error.saveFailed'));
          } finally {
            setBusy(false);
          }
        }}
      >
        <TextAreaField
          label={t('orders.addNote')}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
        />
        {error ? <FormError>{error}</FormError> : null}
        <Button type="submit" size="sm" loading={busy} disabled={body.trim().length < 2}>
          {t('orders.addNote')}
        </Button>
      </form>

      {notes.length > 0 ? (
        <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {notes.map((note) => (
            <li key={note.id} className="text-sm">
              <p className="text-slate-800">{note.body}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {note.author} · {formatDate(note.createdAt, true)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-400">
          {t('orders.noNotes')}
        </p>
      )}
    </Panel>
  );
}
