'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api } from '@/lib/http';
import { useAdmin, useToast } from '@/components/providers/AdminProviders';
import { Panel } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import {
  CheckboxField,
  FieldGroup,
  FormError,
  MoneyField,
  TextField,
} from '@/components/ui/Field';

/**
 * Store settings.
 *
 * These are the numbers the shop actually runs on — delivery, tax, the return
 * window — so they are grouped by the question a shop owner is asking rather
 * than by database column. Money is typed in rupees and converted server-side.
 */

export interface SettingsFormValues {
  nameEn: string;
  nameTa: string;
  email: string;
  phone: string;
  whatsapp: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  gstin: string;
  defaultTaxPercent: string;
  pricesIncludeTax: boolean;
  freeShippingThreshold: string;
  standardShippingFee: string;
  minimumOrderValue: string;
  returnWindowDays: string;
  lowStockNotifyThreshold: string;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

export function SettingsForm({
  initial,
  readOnly,
}: {
  initial: SettingsFormValues;
  readOnly: boolean;
}) {
  const { t, online } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();

  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const set = <K extends keyof SettingsFormValues>(
    key: K,
    value: SettingsFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});

    if (!online) {
      setError(t('offline.blocked'));
      return;
    }

    setBusy(true);
    try {
      await api.put('/api/admin/settings', {
        nameEn: values.nameEn,
        nameTa: values.nameTa,
        email: values.email,
        phone: values.phone,
        whatsapp: values.whatsapp,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        city: values.city,
        district: values.district,
        state: values.state,
        pincode: values.pincode,
        gstin: values.gstin,
        defaultTaxBps: Number(values.defaultTaxPercent) || 0,
        pricesIncludeTax: values.pricesIncludeTax,
        freeShippingThreshold: Number(values.freeShippingThreshold) || 0,
        standardShippingFee: Number(values.standardShippingFee) || 0,
        minimumOrderValue: Number(values.minimumOrderValue) || 0,
        returnWindowDays: Number(values.returnWindowDays) || 0,
        lowStockNotifyThreshold: Number(values.lowStockNotifyThreshold) || 0,
        emailNotificationsEnabled: values.emailNotificationsEnabled,
        pushNotificationsEnabled: values.pushNotificationsEnabled,
      });
      toast(t('settings.saved'));
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else setError(t('error.saveFailed'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-5">
      {error ? <FormError>{error}</FormError> : null}

      <Panel title={t('settings.shopDetails')}>
        <FieldGroup columns={2}>
          <TextField
            label={t('settings.shopName')}
            value={values.nameEn}
            onChange={(event) => set('nameEn', event.target.value)}
            required
            disabled={readOnly}
            error={fields.nameEn}
          />
          <TextField
            label={t('settings.shopNameTa')}
            lang="ta"
            className="font-tamil"
            value={values.nameTa}
            onChange={(event) => set('nameTa', event.target.value)}
            required
            disabled={readOnly}
            error={fields.nameTa}
          />
          <TextField
            label={t('common.email')}
            type="email"
            value={values.email}
            onChange={(event) => set('email', event.target.value)}
            required
            disabled={readOnly}
            error={fields.email}
          />
          <TextField
            label={t('common.phone')}
            value={values.phone}
            onChange={(event) => set('phone', event.target.value)}
            required
            disabled={readOnly}
            error={fields.phone}
          />
          <TextField
            label={t('settings.whatsapp')}
            value={values.whatsapp}
            onChange={(event) => set('whatsapp', event.target.value)}
            optionalLabel={t('common.optional')}
            disabled={readOnly}
            hint="Digits only, with the country code: 919840000000"
          />
          <TextField
            label={t('settings.gstin')}
            value={values.gstin}
            onChange={(event) => set('gstin', event.target.value.toUpperCase())}
            optionalLabel={t('common.optional')}
            className="font-mono"
            disabled={readOnly}
          />
        </FieldGroup>
      </Panel>

      <Panel title={t('settings.address')}>
        <FieldGroup columns={2}>
          <div className="sm:col-span-2">
            <TextField
              label={t('settings.addressLine1')}
              value={values.addressLine1}
              onChange={(event) => set('addressLine1', event.target.value)}
              required
              disabled={readOnly}
              error={fields.addressLine1}
            />
          </div>
          <div className="sm:col-span-2">
            <TextField
              label={t('settings.addressLine2')}
              value={values.addressLine2}
              onChange={(event) => set('addressLine2', event.target.value)}
              optionalLabel={t('common.optional')}
              disabled={readOnly}
            />
          </div>
          <TextField
            label={t('settings.city')}
            value={values.city}
            onChange={(event) => set('city', event.target.value)}
            required
            disabled={readOnly}
            error={fields.city}
          />
          <TextField
            label={t('settings.district')}
            value={values.district}
            onChange={(event) => set('district', event.target.value)}
            required
            disabled={readOnly}
            error={fields.district}
          />
          <TextField
            label={t('settings.state')}
            value={values.state}
            onChange={(event) => set('state', event.target.value)}
            required
            disabled={readOnly}
            error={fields.state}
          />
          <TextField
            label={t('settings.pincode')}
            value={values.pincode}
            onChange={(event) => set('pincode', event.target.value.replace(/\D/g, ''))}
            required
            inputMode="numeric"
            maxLength={6}
            disabled={readOnly}
            error={fields.pincode}
          />
        </FieldGroup>
      </Panel>

      <Panel title={t('settings.delivery')} description={t('settings.deliveryHint')}>
        <FieldGroup columns={2}>
          <MoneyField
            label={t('settings.freeShipping')}
            value={values.freeShippingThreshold}
            onChange={(event) => set('freeShippingThreshold', event.target.value)}
            disabled={readOnly}
            hint="Orders at or above this are delivered free."
            error={fields.freeShippingThreshold}
          />
          <MoneyField
            label={t('settings.shippingFee')}
            value={values.standardShippingFee}
            onChange={(event) => set('standardShippingFee', event.target.value)}
            disabled={readOnly}
            error={fields.standardShippingFee}
          />
          <MoneyField
            label={t('settings.minimumOrder')}
            value={values.minimumOrderValue}
            onChange={(event) => set('minimumOrderValue', event.target.value)}
            disabled={readOnly}
            hint="0 means no minimum."
          />
          <TextField
            label={t('settings.returnWindow')}
            type="number"
            min={0}
            max={90}
            value={values.returnWindowDays}
            onChange={(event) => set('returnWindowDays', event.target.value)}
            disabled={readOnly}
            aside={t('settings.days')}
          />
        </FieldGroup>
      </Panel>

      <Panel title={t('settings.tax')}>
        <FieldGroup columns={2}>
          <TextField
            label={t('settings.defaultTax')}
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={values.defaultTaxPercent}
            onChange={(event) => set('defaultTaxPercent', event.target.value)}
            disabled={readOnly}
            aside="%"
          />
          <div className="flex items-end pb-2.5">
            <CheckboxField
              label={t('settings.pricesIncludeTax')}
              description={t('settings.pricesIncludeTaxHint')}
              checked={values.pricesIncludeTax}
              onChange={(event) => set('pricesIncludeTax', event.target.checked)}
              disabled={readOnly}
            />
          </div>
        </FieldGroup>
      </Panel>

      <Panel title={t('settings.alerts')}>
        <div className="space-y-3">
          <TextField
            label={t('settings.lowStockThreshold')}
            type="number"
            min={0}
            value={values.lowStockNotifyThreshold}
            onChange={(event) => set('lowStockNotifyThreshold', event.target.value)}
            disabled={readOnly}
            hint={t('settings.lowStockThresholdHint')}
          />
          <CheckboxField
            label={t('settings.emailNotifications')}
            checked={values.emailNotificationsEnabled}
            onChange={(event) => set('emailNotificationsEnabled', event.target.checked)}
            disabled={readOnly}
          />
          <CheckboxField
            label={t('settings.pushNotifications')}
            description={t('settings.pushNotificationsHint')}
            checked={values.pushNotificationsEnabled}
            onChange={(event) => set('pushNotificationsEnabled', event.target.checked)}
            disabled={readOnly}
          />
        </div>
      </Panel>

      {!readOnly ? (
        <Button type="submit" size="lg" loading={busy}>
          {t('common.save')}
        </Button>
      ) : (
        <p className="text-sm text-slate-500">{t('settings.readOnly')}</p>
      )}
    </form>
  );
}
