import 'server-only';
import { getPrisma } from '@tamizh/db';
import { shopDateKey } from '@tamizh/core/utils';

/**
 * What the shop's delivery zones say about one pincode.
 *
 * Zones are set up in the admin panel (Delivery zones). The most specific
 * matching prefix wins — "625" before "62" — and an active zone with no
 * prefixes at all is the catch-all for everywhere else. No match, or no
 * zones, means nothing is known: cash on delivery stays available and no
 * delivery estimate is shown, exactly as before zones existed.
 */

export interface DeliveryInfo {
  codAvailable: boolean;
  /** Calendar dates in India, "YYYY-MM-DD". */
  earliest: string;
  latest: string;
}

const MS_PER_DAY = 86_400_000;

export async function deliveryForPincode(pincode: string): Promise<DeliveryInfo | null> {
  const zones = await getPrisma().shippingZone.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      pincodePrefixes: true,
      codAvailable: true,
      minDeliveryDays: true,
      maxDeliveryDays: true,
    },
  });

  let best: (typeof zones)[number] | null = null;
  let bestLength = -1;
  for (const zone of zones) {
    if (zone.pincodePrefixes.length === 0) {
      // Catch-all: used only when nothing more specific matches.
      if (bestLength < 0) {
        best = zone;
        bestLength = 0;
      }
      continue;
    }
    for (const prefix of zone.pincodePrefixes) {
      if (pincode.startsWith(prefix) && prefix.length > bestLength) {
        best = zone;
        bestLength = prefix.length;
      }
    }
  }
  if (!best) return null;

  const now = Date.now();
  const minDays = Math.max(0, best.minDeliveryDays);
  const maxDays = Math.max(minDays, best.maxDeliveryDays);
  return {
    codAvailable: best.codAvailable,
    earliest: shopDateKey(new Date(now + minDays * MS_PER_DAY)),
    latest: shopDateKey(new Date(now + maxDays * MS_PER_DAY)),
  };
}
