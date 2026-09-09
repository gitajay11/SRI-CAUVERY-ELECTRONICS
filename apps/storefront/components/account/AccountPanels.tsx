'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AddressView, SessionUser } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { ApiError, api } from '@/lib/http';
import { INDIAN_STATES, TAMIL_NADU_DISTRICTS } from '@/lib/india';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { FormError, SelectField, TextField } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Primitives';
import { MapPinIcon, TrashIcon } from '@/components/ui/Icons';

/** Name and phone. Email is the account identity and is not editable here. */
export function ProfilePanel({ user }: { user: SessionUser }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  return (
    <form
      className="space-y-4 rounded-card border border-ink-100 bg-surface p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setFields({});
        setBusy(true);
        try {
          await api.patch('/api/account/profile', { name, phone });
          toast(t('account.updated'));
          router.refresh();
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
      <h2 className="text-base font-bold text-ink-900">{t('account.profile')}</h2>

      <TextField
        label={t('auth.name')}
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoComplete="name"
        required
        error={fields.name}
      />
      <TextField
        label={t('auth.email')}
        value={user.email}
        readOnly
        disabled
        autoComplete="email"
      />
      <TextField
        label={t('auth.phone')}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        optionalLabel={t('common.optional')}
        error={fields.phone}
      />

      {error ? <FormError>{error}</FormError> : null}

      <Button type="submit" loading={busy}>
        {t('common.save')}
      </Button>
    </form>
  );
}

/** Password change, current password required. */
export function PasswordPanel() {
  const { t } = useLocale();
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  return (
    <form
      className="space-y-4 rounded-card border border-ink-100 bg-surface p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setFields({});
        setBusy(true);
        try {
          await api.post('/api/account/password', {
            currentPassword: current,
            newPassword: next,
          });
          toast(t('account.passwordChanged'));
          setCurrent('');
          setNext('');
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
      <h2 className="text-base font-bold text-ink-900">{t('account.security')}</h2>

      <TextField
        label={t('account.currentPassword')}
        type="password"
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        autoComplete="current-password"
        required
        error={fields.currentPassword}
      />
      <TextField
        label={t('account.newPassword')}
        type="password"
        value={next}
        onChange={(event) => setNext(event.target.value)}
        autoComplete="new-password"
        minLength={8}
        hint={t('auth.passwordHint')}
        required
        error={fields.newPassword}
      />

      {error ? <FormError>{error}</FormError> : null}

      <Button type="submit" variant="outline" loading={busy}>
        {t('account.changePassword')}
      </Button>
    </form>
  );
}

/** Saved delivery addresses. */
export function AddressPanel({ addresses }: { addresses: AddressView[] }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [adding, setAdding] = useState(addresses.length === 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    district: '',
    state: 'Tamil Nadu',
    pincode: '',
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await api.delete(`/api/account/addresses/${id}`);
      router.refresh();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : t('error.body'), {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (id: string) => {
    setBusy(true);
    try {
      await api.patch(`/api/account/addresses/${id}`);
      router.refresh();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : t('error.body'), {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-card border border-ink-100 bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-ink-900">{t('account.addresses')}</h2>
        {!adding ? (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            {t('account.addAddress')}
          </Button>
        ) : null}
      </div>

      {addresses.length === 0 && !adding ? (
        <p className="mt-3 text-sm text-ink-500">{t('account.noAddresses')}</p>
      ) : null}

      {addresses.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className={cn(
                'rounded-xl border p-3.5 text-sm',
                address.isDefault ? 'border-brand-300 bg-brand-50/60' : 'border-ink-200',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ink-900">{address.fullName}</p>
                {address.isDefault ? (
                  <Badge tone="brand">{t('account.default')}</Badge>
                ) : null}
              </div>
              <address className="mt-1 not-italic leading-relaxed text-ink-600">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
                <br />
                {address.city}, {address.district}
                <br />
                {address.state} — {address.pincode}
                <br />
                {address.phone}
              </address>
              <div className="mt-3 flex gap-3 text-xs font-semibold">
                {!address.isDefault ? (
                  <button
                    type="button"
                    onClick={() => makeDefault(address.id)}
                    disabled={busy}
                    className="text-brand-700 hover:underline disabled:opacity-50"
                  >
                    {t('account.setDefault')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(address.id)}
                  disabled={busy}
                  className="flex items-center gap-1 text-danger-500 hover:underline disabled:opacity-50"
                >
                  <TrashIcon className="text-sm" />
                  {t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {adding ? (
        <form
          className="mt-5 grid gap-4 border-t border-ink-100 pt-5 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setFields({});
            setBusy(true);
            try {
              await api.post('/api/account/addresses', {
                ...form,
                label: 'HOME',
                isDefault: addresses.length === 0,
              });
              toast(t('admin.saved'));
              setAdding(false);
              setForm({
                fullName: '',
                phone: '',
                line1: '',
                line2: '',
                city: '',
                district: '',
                state: 'Tamil Nadu',
                pincode: '',
              });
              router.refresh();
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
          <div className="sm:col-span-2">
            <p className="flex items-center gap-2 text-sm font-bold text-ink-800">
              <MapPinIcon className="text-base text-brand-600" />
              {t('account.addAddress')}
            </p>
          </div>

          <TextField
            label={t('checkout.contact.name')}
            value={form.fullName}
            onChange={(event) => set('fullName')(event.target.value)}
            autoComplete="name"
            required
            error={fields.fullName}
          />
          <TextField
            label={t('checkout.contact.phone')}
            value={form.phone}
            onChange={(event) => set('phone')(event.target.value)}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            error={fields.phone}
          />
          <div className="sm:col-span-2">
            <TextField
              label={t('checkout.address.line1')}
              value={form.line1}
              onChange={(event) => set('line1')(event.target.value)}
              autoComplete="address-line1"
              required
              error={fields.line1}
            />
          </div>
          <div className="sm:col-span-2">
            <TextField
              label={t('checkout.address.line2')}
              value={form.line2}
              onChange={(event) => set('line2')(event.target.value)}
              autoComplete="address-line2"
              optionalLabel={t('common.optional')}
            />
          </div>
          <TextField
            label={t('checkout.address.city')}
            value={form.city}
            onChange={(event) => set('city')(event.target.value)}
            required
            error={fields.city}
          />
          <TextField
            label={t('checkout.address.district')}
            value={form.district}
            onChange={(event) => set('district')(event.target.value)}
            list="account-districts"
            required
            error={fields.district}
          />
          <datalist id="account-districts">
            {TAMIL_NADU_DISTRICTS.map((district) => (
              <option key={district} value={district} />
            ))}
          </datalist>
          <SelectField
            label={t('checkout.address.state')}
            value={form.state}
            onChange={(event) => set('state')(event.target.value)}
            required
          >
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </SelectField>
          <TextField
            label={t('checkout.address.pincode')}
            value={form.pincode}
            onChange={(event) => set('pincode')(event.target.value)}
            inputMode="numeric"
            maxLength={6}
            required
            error={fields.pincode}
          />

          {error ? (
            <div className="sm:col-span-2">
              <FormError>{error}</FormError>
            </div>
          ) : null}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={busy}>
              {t('common.save')}
            </Button>
            {addresses.length > 0 ? (
              <Button variant="ghost" onClick={() => setAdding(false)} disabled={busy}>
                {t('common.cancel')}
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
