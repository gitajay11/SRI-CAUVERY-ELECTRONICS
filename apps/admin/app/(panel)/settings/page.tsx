import { paiseToRupees } from '@tamizh/core/money';
import { requireAnyPermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getSettings, listShippingZones } from '@/services/settings';
import { PageHeader, Panel } from '@/components/ui/Primitives';
import { SettingsForm, type SettingsFormValues } from '@/components/settings/SettingsForm';
import { ShippingZones } from '@/components/settings/ShippingZones';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const identity = await requireAnyPermission('settings.view', 'settings.manage');
  const { t } = await getI18n();

  const [settings, zones] = await Promise.all([getSettings(), listShippingZones()]);

  const canManage = identity.permissions.has('settings.manage');
  const canManageShipping = identity.permissions.has('shipping.manage');

  const initial: SettingsFormValues = {
    nameEn: settings.nameEn,
    nameTa: settings.nameTa,
    email: settings.email,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    city: settings.city,
    district: settings.district,
    state: settings.state,
    pincode: settings.pincode,
    gstin: settings.gstin ?? '',
    defaultTaxPercent: String(settings.defaultTaxBps / 100),
    pricesIncludeTax: settings.pricesIncludeTax,
    freeShippingThreshold: String(paiseToRupees(settings.freeShippingThreshold)),
    standardShippingFee: String(paiseToRupees(settings.standardShippingFee)),
    minimumOrderValue: String(paiseToRupees(settings.minimumOrderValue)),
    returnWindowDays: String(settings.returnWindowDays),
    lowStockNotifyThreshold: String(settings.lowStockNotifyThreshold),
    emailNotificationsEnabled: settings.emailNotificationsEnabled,
    pushNotificationsEnabled: settings.pushNotificationsEnabled,
  };

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.deliveryHint')} />

      <div className="space-y-5">
        <SettingsForm initial={initial} readOnly={!canManage} />

        <Panel
          title={t('settings.zones')}
          description={t('settings.zonesHint')}
          className="max-w-3xl"
        >
          <ShippingZones
            zones={zones.map((zone) => ({
              id: zone.id,
              name: zone.name,
              pincodePrefixes: zone.pincodePrefixes,
              shippingFee: zone.shippingFee,
              minDeliveryDays: zone.minDeliveryDays,
              maxDeliveryDays: zone.maxDeliveryDays,
              codAvailable: zone.codAvailable,
              isActive: zone.isActive,
              sortOrder: zone.sortOrder,
            }))}
            canManage={canManageShipping}
          />
        </Panel>
      </div>
    </>
  );
}
