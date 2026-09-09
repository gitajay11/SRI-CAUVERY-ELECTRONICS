'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiError, api } from '@/lib/http';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { FormError, TextAreaField, TextField } from '@/components/ui/Field';
import { CheckIcon } from '@/components/ui/Icons';

/**
 * Contact / enquiry form.
 *
 * Arriving from the bulk-gift call to action (`?enquiry=bulk`) pre-fills the
 * subject and gives the shopper a prompt for the details we always end up
 * asking for anyway.
 */
export function ContactForm() {
  const { t } = useLocale();
  const params = useSearchParams();
  const isBulk = params.get('enquiry') === 'bulk';

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: isBulk ? 'Bulk / return gift enquiry' : '',
    message: isBulk
      ? 'Occasion: \nNumber of guests: \nBudget per gift: \nDelivery date: \nDelivery town: '
      : '',
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-card border border-success-500/25 bg-success-50 p-5">
        <CheckIcon className="mt-0.5 shrink-0 text-xl text-success-500" />
        <div>
          <p className="font-bold text-success-500">{t('contact.sent')}</p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-2 text-sm font-semibold text-brand-700 hover:underline"
          >
            {t('contact.send')} →
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4 rounded-card border border-ink-100 bg-surface p-5 sm:p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setFields({});
        setBusy(true);
        try {
          await api.post('/api/contact', form);
          setSent(true);
        } catch (caught) {
          if (caught instanceof ApiError) {
            setError(caught.message);
            setFields(caught.fields ?? {});
          } else setError(t('error.body'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('contact.name')}
          value={form.name}
          onChange={(event) => set('name')(event.target.value)}
          autoComplete="name"
          required
          error={fields.name}
        />
        <TextField
          label={t('contact.phone')}
          value={form.phone}
          onChange={(event) => set('phone')(event.target.value)}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          optionalLabel={t('common.optional')}
          error={fields.phone}
        />
      </div>

      <TextField
        label={t('contact.email')}
        value={form.email}
        onChange={(event) => set('email')(event.target.value)}
        type="email"
        autoComplete="email"
        required
        error={fields.email}
      />

      <TextField
        label={t('contact.subject')}
        value={form.subject}
        onChange={(event) => set('subject')(event.target.value)}
        required
        error={fields.subject}
      />

      <TextAreaField
        label={t('contact.message')}
        value={form.message}
        onChange={(event) => set('message')(event.target.value)}
        rows={6}
        required
        minLength={10}
        error={fields.message}
      />

      {error ? <FormError>{error}</FormError> : null}

      <Button type="submit" size="lg" loading={busy}>
        {t('contact.send')}
      </Button>
    </form>
  );
}
