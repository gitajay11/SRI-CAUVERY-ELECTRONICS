'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api } from '@/lib/http';
import { translate, type Dictionary, type TranslationKey } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { FormError, TextField } from '@/components/ui/Field';

/**
 * Change your own password.
 *
 * The rules are shown before they are broken rather than as an error
 * afterwards, and the strength of what has been typed is described in words —
 * a coloured bar tells someone their password is "weak" without saying what
 * would make it better.
 */
export function ChangePasswordForm({
  forced,
  dictionary,
}: {
  forced: boolean;
  /**
   * Passed in rather than read from a provider: this page sits outside the
   * panel shell, because the shell is what sends people here.
   */
  dictionary: Dictionary;
}) {
  const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(dictionary, key, vars);
  const router = useRouter();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const rules = [
    { met: next.length >= 12, label: t('account.rule12') },
    { met: /[a-z]/.test(next) && /[A-Z]/.test(next), label: t('account.ruleCase') },
    { met: /\d/.test(next), label: t('account.ruleDigit') },
  ];
  const allMet = rules.every((rule) => rule.met);
  const matches = next.length > 0 && next === confirm;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});

    if (!matches) {
      setFields({ confirm: t('account.mismatch') });
      return;
    }

    setBusy(true);
    try {
      await api.post('/api/admin/account/password', {
        currentPassword: current,
        newPassword: next,
      });
      router.replace('/');
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
    <form onSubmit={submit} noValidate className="space-y-4">
      {error ? <FormError>{error}</FormError> : null}

      <TextField
        label={t('account.currentPassword')}
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        required
        error={fields.currentPassword}
      />

      <TextField
        label={t('account.newPassword')}
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(event) => setNext(event.target.value)}
        required
        error={fields.newPassword}
      />

      <ul className="space-y-1 text-xs">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={rule.met ? 'text-positive-600' : 'text-slate-500'}
          >
            <span aria-hidden="true">{rule.met ? '✓' : '·'}</span> {rule.label}
          </li>
        ))}
      </ul>

      <TextField
        label={t('account.confirmPassword')}
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        required
        error={fields.confirm}
      />

      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={busy}
        disabled={!allMet || !matches || current.length === 0}
      >
        {t('account.changePassword')}
      </Button>

      {forced ? (
        <p className="text-center text-xs text-slate-400">{t('account.forcedNote')}</p>
      ) : null}
    </form>
  );
}
