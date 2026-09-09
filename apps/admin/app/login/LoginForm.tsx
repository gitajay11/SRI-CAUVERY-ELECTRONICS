'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiError, api } from '@/lib/http';
import { translate } from '@/i18n';
import { en } from '@/i18n/en';
import { Button } from '@/components/ui/Button';
import { FormError, PasswordField, TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Primitives';
import { InfoIcon } from '@/components/ui/Icons';

/**
 * Sign-in form.
 *
 * Uses the English dictionary directly rather than the locale provider: the
 * provider needs a session, and there is not one yet. The sign-in screen is
 * the only place in the app where that trade-off applies.
 */
export function LoginForm() {
  const params = useSearchParams();
  const t = (key: keyof typeof en, vars?: Record<string, string | number>) =>
    translate(en, key, vars);

  const reason = params.get('reason');
  const next = params.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});
    setBusy(true);

    try {
      const result = await api.post<{ mustChangePassword: boolean }>(
        '/api/admin/auth/login',
        { email, password },
      );

      // A full navigation rather than router.push: the shell reads the session
      // on the server, and a soft navigation would render it from a cache that
      // predates the cookie.
      window.location.href = result.mustChangePassword
        ? '/account/password?forced=1'
        : next?.startsWith('/')
          ? next
          : '/';
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else {
        setError(t('error.body'));
      }
      setBusy(false);
    }
  };

  return (
    <>
      {reason === 'expired' ? (
        <Alert tone="caution" icon={<InfoIcon />} className="mt-5">
          {t('auth.sessionExpired')}
        </Alert>
      ) : null}
      {reason === 'forbidden' ? (
        <Alert tone="critical" icon={<InfoIcon />} className="mt-5">
          {t('auth.forbidden')}
        </Alert>
      ) : null}

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <TextField
          label={t('auth.email')}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          autoFocus
          required
          error={fields.email}
        />
        <PasswordField
          label={t('auth.password')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          error={fields.password}
          revealLabel={t('auth.showPassword')}
          hideLabel={t('auth.hidePassword')}
          capsLockLabel={t('auth.capsLock')}
        />

        {error ? <FormError>{error}</FormError> : null}

        <Button type="submit" size="lg" fullWidth loading={busy}>
          {busy ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </form>
    </>
  );
}
