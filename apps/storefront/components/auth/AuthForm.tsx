'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError, api } from '@/lib/http';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { FormError, TextField } from '@/components/ui/Field';
import { BrandGlyph } from '@/components/layout/BrandMark';

/**
 * Sign-in and registration.
 *
 * One component for both, because the two forms differ only by two fields and
 * an endpoint — and keeping them together guarantees identical error handling
 * and the same post-login redirect behaviour.
 */
export function AuthForm({ mode }: { mode: 'signin' | 'register' }) {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const isRegister = mode === 'register';
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});
    setBusy(true);

    try {
      if (isRegister) {
        await api.post('/api/auth/register', {
          name: form.name,
          email: form.email,
          password: form.password,
          ...(form.phone ? { phone: form.phone } : {}),
        });
      } else {
        await api.post('/api/auth/login', {
          email: form.email,
          password: form.password,
        });
      }
      // A full refresh so the server components pick up the new session.
      router.push(next.startsWith('/') ? next : '/');
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else {
        setError(t('error.body'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <BrandGlyph className="mx-auto size-14" />
        <h1 className="mt-4 text-2xl font-extrabold text-ink-900">
          {isRegister ? t('auth.register.title') : t('auth.signIn.title')}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          {isRegister ? t('auth.register.subtitle') : t('auth.signIn.subtitle')}
        </p>
      </div>

      <form
        onSubmit={submit}
        noValidate
        className="space-y-4 rounded-card border border-ink-100 bg-surface p-5 shadow-card sm:p-6"
      >
        {isRegister ? (
          <TextField
            label={t('auth.name')}
            value={form.name}
            onChange={(event) => set('name')(event.target.value)}
            autoComplete="name"
            required
            error={fields.name}
          />
        ) : null}

        <TextField
          label={t('auth.email')}
          type="email"
          value={form.email}
          onChange={(event) => set('email')(event.target.value)}
          autoComplete="email"
          required
          error={fields.email}
        />

        {isRegister ? (
          <TextField
            label={t('auth.phone')}
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(event) => set('phone')(event.target.value)}
            autoComplete="tel"
            optionalLabel={t('common.optional')}
            placeholder="98400 00000"
            error={fields.phone}
          />
        ) : null}

        <TextField
          label={t('auth.password')}
          type="password"
          value={form.password}
          onChange={(event) => set('password')(event.target.value)}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={isRegister ? 8 : undefined}
          hint={isRegister ? t('auth.passwordHint') : undefined}
          required
          error={fields.password}
        />

        {error ? <FormError>{error}</FormError> : null}

        <Button type="submit" size="lg" fullWidth loading={busy}>
          {isRegister ? t('auth.submitRegister') : t('auth.submitSignIn')}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-600">
        {isRegister ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
        <Link
          href={
            isRegister
              ? `/signin?next=${encodeURIComponent(next)}`
              : `/register?next=${encodeURIComponent(next)}`
          }
          className="font-semibold text-link hover:underline"
        >
          {isRegister ? t('auth.submitSignIn') : t('nav.register')}
        </Link>
      </p>
    </div>
  );
}
