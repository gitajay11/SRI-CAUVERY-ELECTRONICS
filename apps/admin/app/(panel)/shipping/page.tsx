import Link from 'next/link';
import { paiseToRupees } from '@tamizh/core/money';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getSettings, listShippingZones } from '@/services/settings';
import { PageHeader, Panel, DescriptionList, DescriptionRow } from '@/components/ui/Primitives';
import { ShippingZones } from '@/components/settings/ShippingZones';

export const metadata = { title: 'Delivery' };

/**
 * Delivery zones.
 *
 * The shop-wide charge lives in Settings; this page is about the exceptions —
 * the places where delivery costs more, arrives sooner, or where cash on
 * delivery is not offered.
 */
export default async function ShippingPage() {
  const identity = await requirePermission('shipping.manage');
  const { t } = await getI18n();

  const [zones, settings] = await Promise.all([listShippingZones(), getSettings()]);

  return (
    <>
      <PageHeader title={t('settings.zones')} description={t('settings.zonesHint')} />

      <div className="max-w-3xl space-y-5">
        <Panel title={t('settings.delivery')}>
          <DescriptionList>
            <DescriptionRow label={t('settings.shippingFee')}>
              ₹{paiseToRupees(settings.standardShippingFee).toFixed(2)}
            </DescriptionRow>
            <DescriptionRow label={t('settings.freeShipping')}>
              ₹{paiseToRupees(settings.freeShippingThreshold).toFixed(2)}
            </DescriptionRow>
          </DescriptionList>
          <Link
            href="/settings"
            className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline"
          >
            {t('settings.title')} →
          </Link>
        </Panel>

        <Panel title={t('settings.zones')}>
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
            canManage={identity.permissions.has('shipping.manage')}
          />
        </Panel>
      </div>
    </>
  );
}
