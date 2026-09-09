import 'server-only';
import { getPrisma } from '@tamizh/db';
import { DEFAULT_SHIPPING_RULES, type ShippingRules } from '@tamizh/core/pricing';

/**
 * The shop's own settings, as configured in the admin panel.
 *
 * Delivery charges, the free-delivery threshold and the minimum order are all
 * decisions the shop owner makes without a developer, so they are read from the
 * database rather than compiled in. The built-in constants remain as a fallback
 * for the moment before the settings row exists (a fresh database, a failed
 * read) — a shopper should never see a broken cart because a settings lookup
 * hiccuped.
 *
 * Cached for a few seconds: a cart page reads this on every render, and these
 * values change a handful of times a year.
 */

export interface ShopSettings extends ShippingRules {
  minimumOrderValue: number;
  returnWindowDays: number;
  freeShippingThreshold: number;
  standardShippingFee: number;
}

const FALLBACK: ShopSettings = {
  ...DEFAULT_SHIPPING_RULES,
  minimumOrderValue: 0,
  returnWindowDays: 7,
};

const CACHE_MS = 15_000;
let cached: { value: ShopSettings; at: number } | null = null;

export async function getShopSettings(): Promise<ShopSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  try {
    const row = await getPrisma().storeSettings.findUnique({
      where: { id: 'default' },
      select: {
        freeShippingThreshold: true,
        standardShippingFee: true,
        minimumOrderValue: true,
        returnWindowDays: true,
      },
    });

    const value: ShopSettings = row
      ? {
          freeShippingThreshold: row.freeShippingThreshold,
          standardShippingFee: row.standardShippingFee,
          minimumOrderValue: row.minimumOrderValue,
          returnWindowDays: row.returnWindowDays,
        }
      : FALLBACK;

    cached = { value, at: Date.now() };
    return value;
  } catch (error) {
    console.error('[settings] falling back to built-in shop defaults', error);
    return FALLBACK;
  }
}

/** Just the two numbers `calculateTotals` needs. */
export async function getShippingRules(): Promise<ShippingRules> {
  const settings = await getShopSettings();
  return {
    freeShippingThreshold: settings.freeShippingThreshold,
    standardShippingFee: settings.standardShippingFee,
  };
}
