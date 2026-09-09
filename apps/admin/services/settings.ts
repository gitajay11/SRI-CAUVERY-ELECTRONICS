import 'server-only';
import { db } from '@tamizh/db';
import { notFound } from '@tamizh/core/api';
import { recordAudit, diff } from '@/lib/audit';
import type { AdminIdentity } from '@/lib/session';

/**
 * Store settings, delivery zones and homepage content.
 *
 * These are the levers a shop owner pulls without a developer: what the shop
 * is called, what delivery costs, how long a return window runs, what the
 * homepage says. Everything here is read by the storefront from the same row,
 * so a change takes effect for shoppers without a deploy.
 *
 * Every change is audited with its before and after, because "who put the free
 * delivery threshold up to ₹2,000?" is a question that gets asked.
 */

export const SETTINGS_ID = 'default';

export async function getSettings() {
  const settings = await db.storeSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings) throw notFound('Store settings have not been created yet.');
  return settings;
}

export interface SettingsInput {
  nameEn: string;
  nameTa: string;
  email: string;
  phone: string;
  whatsapp?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  gstin?: string;
  /** Basis points. */
  defaultTaxBps: number;
  pricesIncludeTax: boolean;
  /** Paise. */
  freeShippingThreshold: number;
  standardShippingFee: number;
  minimumOrderValue: number;
  returnWindowDays: number;
  lowStockNotifyThreshold: number;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

export async function updateSettings(actor: AdminIdentity, input: SettingsInput) {
  const before = await getSettings();

  await db.$transaction(async (tx) => {
    await tx.storeSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        nameEn: input.nameEn,
        nameTa: input.nameTa,
        email: input.email,
        phone: input.phone,
        whatsapp: input.whatsapp || '',
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 || '',
        city: input.city,
        district: input.district,
        state: input.state,
        pincode: input.pincode,
        gstin: input.gstin || null,
        defaultTaxBps: input.defaultTaxBps,
        pricesIncludeTax: input.pricesIncludeTax,
        freeShippingThreshold: input.freeShippingThreshold,
        standardShippingFee: input.standardShippingFee,
        minimumOrderValue: input.minimumOrderValue,
        returnWindowDays: input.returnWindowDays,
        lowStockNotifyThreshold: input.lowStockNotifyThreshold,
        emailNotificationsEnabled: input.emailNotificationsEnabled,
        pushNotificationsEnabled: input.pushNotificationsEnabled,
      },
    });

    await recordAudit(
      actor,
      {
        action: 'settings.updated',
        entityType: 'StoreSettings',
        entityId: SETTINGS_ID,
        summary: 'Updated store settings',
        changes: diff(
          before as unknown as Record<string, unknown>,
          input as unknown as Record<string, unknown>,
          [
            'nameEn',
            'nameTa',
            'email',
            'phone',
            'gstin',
            'defaultTaxBps',
            'pricesIncludeTax',
            'freeShippingThreshold',
            'standardShippingFee',
            'minimumOrderValue',
            'returnWindowDays',
            'lowStockNotifyThreshold',
            'emailNotificationsEnabled',
            'pushNotificationsEnabled',
          ],
        ),
      },
      tx,
    );
  });

  return { updated: true };
}

// ---------------------------------------------------------------------------
// Shipping zones
// ---------------------------------------------------------------------------

export async function listShippingZones() {
  return db.shippingZone.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export interface ShippingZoneInput {
  name: string;
  pincodePrefixes: string[];
  /** Paise, or null to use the store default. */
  shippingFee?: number | null;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  codAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
}

export async function saveShippingZone(
  actor: AdminIdentity,
  id: string | null,
  input: ShippingZoneInput,
) {
  const data = {
    name: input.name,
    pincodePrefixes: input.pincodePrefixes,
    shippingFee: input.shippingFee ?? null,
    minDeliveryDays: input.minDeliveryDays,
    maxDeliveryDays: Math.max(input.minDeliveryDays, input.maxDeliveryDays),
    codAvailable: input.codAvailable,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };

  const zone = await db.$transaction(async (tx) => {
    const saved = id
      ? await tx.shippingZone.update({ where: { id }, data, select: { id: true, name: true } })
      : await tx.shippingZone.create({ data, select: { id: true, name: true } });

    await recordAudit(
      actor,
      {
        action: 'shipping.updated',
        entityType: 'ShippingZone',
        entityId: saved.id,
        summary: `${id ? 'Updated' : 'Created'} delivery zone ${saved.name}`,
      },
      tx,
    );

    return saved;
  });

  return zone;
}

export async function removeShippingZone(actor: AdminIdentity, id: string) {
  const zone = await db.shippingZone.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!zone) throw notFound('Delivery zone not found.');

  await db.$transaction(async (tx) => {
    await tx.shippingZone.delete({ where: { id } });
    await recordAudit(
      actor,
      {
        action: 'shipping.updated',
        entityType: 'ShippingZone',
        entityId: id,
        summary: `Deleted delivery zone ${zone.name}`,
      },
      tx,
    );
  });

  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Homepage content
// ---------------------------------------------------------------------------

export async function listBanners() {
  return db.banner.findMany({
    orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }],
  });
}

export interface BannerInput {
  placement: 'HERO' | 'PROMO_STRIP' | 'CATEGORY_FEATURE' | 'ANNOUNCEMENT';
  title: string;
  titleTa?: string;
  subtitle?: string;
  subtitleTa?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaLabelTa?: string;
  ctaHref?: string;
  isActive: boolean;
  sortOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export async function saveBanner(
  actor: AdminIdentity,
  id: string | null,
  input: BannerInput,
) {
  const data = {
    placement: input.placement,
    title: input.title,
    titleTa: input.titleTa || null,
    subtitle: input.subtitle || null,
    subtitleTa: input.subtitleTa || null,
    imageUrl: input.imageUrl || null,
    ctaLabel: input.ctaLabel || null,
    ctaLabelTa: input.ctaLabelTa || null,
    ctaHref: input.ctaHref || null,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  };

  const banner = await db.$transaction(async (tx) => {
    const saved = id
      ? await tx.banner.update({ where: { id }, data, select: { id: true, title: true } })
      : await tx.banner.create({ data, select: { id: true, title: true } });

    await recordAudit(
      actor,
      {
        action: 'content.updated',
        entityType: 'Banner',
        entityId: saved.id,
        summary: `${id ? 'Updated' : 'Created'} banner “${saved.title}”`,
      },
      tx,
    );

    return saved;
  });

  return banner;
}

export async function removeBanner(actor: AdminIdentity, id: string) {
  const banner = await db.banner.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!banner) throw notFound('Banner not found.');

  await db.$transaction(async (tx) => {
    await tx.banner.delete({ where: { id } });
    await recordAudit(
      actor,
      {
        action: 'content.updated',
        entityType: 'Banner',
        entityId: id,
        summary: `Deleted banner “${banner.title}”`,
      },
      tx,
    );
  });

  return { deleted: true };
}
