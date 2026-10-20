'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AddressView, SessionUser } from '@tamizh/core/types';
import { cn } from '@tamizh/core/utils';
import { ApiError, api, apiRequest } from '@/lib/http';
import { INDIAN_STATES, TAMIL_NADU_DISTRICTS } from '@/lib/india';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useNavigation } from '@/hooks/useNavigation';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { FormError, SelectField, TextField } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Primitives';
import { MapPinIcon, SpinnerIcon, TrashIcon } from '@/components/ui/Icons';

/** Name and phone. Email is the account identity and is not editable here. */
export function ProfilePanel({ user }: { user: SessionUser }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const { refresh, pending } = useNavigation();
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
          refresh();
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

      <Button type="submit" loading={busy || pending}>
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

/**
 * Deleting the account, behind a second step and the password.
 *
 * The server refuses while an order, return or cancellation is still open;
 * that refusal is shown with a way to the orders page rather than as a bare
 * error, because it is the one thing standing between the shopper and done.
 */
export function DeleteAccountPanel() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { replace, pending } = useNavigation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const close = () => {
    setOpen(false);
    setPassword('');
    setError(null);
    setBlocked(false);
    setPasswordError(undefined);
  };

  return (
    <section className="space-y-4 rounded-card border border-danger-500/25 bg-surface p-4 sm:p-5">
      <div>
        <h2 className="text-base font-bold text-danger-600">{t('account.delete.title')}</h2>
        <p className="mt-1 text-sm text-ink-500">{t('account.delete.intro')}</p>
      </div>

      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <TrashIcon className="text-base" />
          {t('account.delete.start')}
        </Button>
      ) : (
        <form
          className="space-y-4 rounded-xl bg-danger-50/60 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setBlocked(false);
            setPasswordError(undefined);
            setBusy(true);
            try {
              await apiRequest('/api/account', { method: 'DELETE', json: { password } });
              toast(t('account.delete.done'), { tone: 'info' });
              // As with signing out: the server tree re-renders signed out,
              // and this page is not left in history to come back to.
              replace('/', { refresh: true });
            } catch (caught) {
              setBusy(false);
              if (!(caught instanceof ApiError)) setError(t('error.body'));
              else if (caught.code === 'invalid_password') {
                setPasswordError(t('account.delete.wrongPassword'));
              } else if (caught.code === 'orders_in_progress') setBlocked(true);
              else setError(caught.message);
            }
          }}
        >
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-700">
            <li className="font-semibold text-danger-600">{t('account.delete.removed')}</li>
            <li>{t('account.delete.kept')}</li>
          </ul>

          <TextField
            label={t('account.delete.password')}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            error={passwordError}
          />

          {blocked ? (
            <FormError>
              {t('account.delete.ordersInProgress')}{' '}
              <Link href="/orders" className="font-semibold underline">
                {t('account.delete.viewOrders')}
              </Link>
            </FormError>
          ) : null}
          {error ? <FormError>{error}</FormError> : null}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={close} disabled={busy || pending}>
              {t('common.back')}
            </Button>
            <Button
              type="submit"
              variant="danger"
              className="flex-1"
              loading={busy || pending}
              disabled={password.length === 0}
            >
              {t('account.delete.confirm')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

/** Saved delivery addresses. */
export function AddressPanel({ addresses }: { addresses: AddressView[] }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const { refresh, pending } = useNavigation();
  const [adding, setAdding] = useState(addresses.length === 0);
  const [busy, setBusy] = useState(false);
  // Which address an action is working on, and which action, so the spinner
  // appears on the link that was pressed and nowhere else.
  const [acting, setActing] = useState<{ id: string; kind: 'default' | 'remove' } | null>(null);
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
    setActing({ id, kind: 'remove' });
    try {
      await api.delete(`/api/account/addresses/${id}`);
      refresh();
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
    setActing({ id, kind: 'default' });
    try {
      await api.patch(`/api/account/addresses/${id}`);
      refresh();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : t('error.body'), {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  // The action is over once the refreshed list is on screen.
  const working = busy || pending;
  const spinning = (id: string, kind: 'default' | 'remove') =>
    working && acting?.id === id && acting.kind === kind;

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
                address.isDefault ? 'border-action-edge/60 bg-success-50/60' : 'border-ink-200',
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
                    disabled={working}
                    className="flex items-center gap-1 text-link hover:underline disabled:opacity-50"
                  >
                    {spinning(address.id, 'default') ? <SpinnerIcon className="text-sm" /> : null}
                    {t('account.setDefault')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(address.id)}
                  disabled={working}
                  className="flex items-center gap-1 text-danger-500 hover:underline disabled:opacity-50"
                >
                  {spinning(address.id, 'remove') ? (
                    <SpinnerIcon className="text-sm" />
                  ) : (
                    <TrashIcon className="text-sm" />
                  )}
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
              refresh();
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
              <MapPinIcon className="text-base text-link" />
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
            <Button type="submit" loading={busy || pending}>
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
