import type { StaffRole } from '@tamizh/db/enums';

/**
 * Role-based access control.
 *
 * Permissions are dotted `domain.action` strings. This module defines which
 * permissions *exist* and the default matrix per role; the `RolePermission`
 * table then lets a SUPER_ADMIN tighten or widen a role without a deploy, and
 * `AdminUser.permissionOverrides` tunes one individual.
 *
 * Resolution order, most specific first:
 *   1. user override deny   → refused
 *   2. user override allow  → granted
 *   3. RolePermission row   → whatever it says
 *   4. DEFAULT_ROLE_MATRIX  → fallback
 *   5. otherwise            → refused
 *
 * Nothing here runs in the browser as an authority. The admin UI uses it to
 * hide what a person cannot use; every API handler re-checks server-side.
 */

export const PERMISSIONS = {
  // Dashboard and reporting
  'dashboard.view': 'View the dashboard',
  'reports.view': 'View reports',
  'reports.export': 'Export reports',
  'analytics.view': 'View sales analytics',

  // Catalogue
  'products.view': 'View products',
  'products.create': 'Create products',
  'products.update': 'Edit products',
  'products.delete': 'Archive or delete products',
  'products.publish': 'Publish and unpublish products',
  'products.price': 'Change prices and discounts',
  'categories.view': 'View categories',
  'categories.manage': 'Create, edit and reorder categories',

  // Inventory
  'inventory.view': 'View stock levels',
  'inventory.adjust': 'Adjust stock',
  'inventory.history': 'View stock movement history',

  // Orders
  'orders.view': 'View orders',
  'orders.update_status': 'Move orders through fulfilment',
  'orders.cancel': 'Cancel orders',
  'orders.note': 'Add internal notes to orders',

  // Money
  'payments.view': 'View payments',
  'refunds.view': 'View refunds',
  'refunds.approve': 'Approve and reject refunds',
  'returns.view': 'View return requests',
  'returns.manage': 'Approve, reject and progress returns',

  // Customers
  'customers.view': 'View customers',
  'customers.manage': 'Block and unblock customers',

  // Marketing
  'coupons.view': 'View coupons',
  'coupons.manage': 'Create and edit coupons',
  'reviews.view': 'View reviews',
  'reviews.moderate': 'Approve, hide and reply to reviews',
  'content.manage': 'Edit banners and homepage content',

  // Administration
  'settings.view': 'View store settings',
  'settings.manage': 'Change store settings',
  'shipping.manage': 'Configure shipping and delivery',
  'staff.view': 'View staff accounts',
  'staff.manage': 'Create, edit and disable staff accounts',
  'roles.manage': 'Change what each role may do',
  'audit.view': 'View the audit log',
  'notifications.view': 'View admin notifications',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

const READ_ONLY_SUPPORT: Permission[] = [
  'dashboard.view',
  'orders.view',
  'orders.note',
  'customers.view',
  'payments.view',
  'returns.view',
  'reviews.view',
  'products.view',
  'inventory.view',
  'notifications.view',
];

/**
 * Default permissions per role.
 *
 * SUPER_ADMIN is intentionally absent — it is granted everything by
 * `roleHasPermission`, so a newly added permission is never accidentally
 * locked away from the owner.
 */
export const DEFAULT_ROLE_MATRIX: Record<StaffRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  ADMIN: [
    'dashboard.view',
    'reports.view',
    'reports.export',
    'analytics.view',
    'products.view',
    'products.create',
    'products.update',
    'products.delete',
    'products.publish',
    'products.price',
    'categories.view',
    'categories.manage',
    'inventory.view',
    'inventory.adjust',
    'inventory.history',
    'orders.view',
    'orders.update_status',
    'orders.cancel',
    'orders.note',
    'payments.view',
    'refunds.view',
    'refunds.approve',
    'returns.view',
    'returns.manage',
    'customers.view',
    'customers.manage',
    'coupons.view',
    'coupons.manage',
    'reviews.view',
    'reviews.moderate',
    'content.manage',
    'settings.view',
    'shipping.manage',
    'notifications.view',
    'audit.view',
  ],

  MANAGER: [
    'dashboard.view',
    'reports.view',
    'reports.export',
    'analytics.view',
    'products.view',
    'products.create',
    'products.update',
    'products.publish',
    'products.price',
    'categories.view',
    'categories.manage',
    'inventory.view',
    'inventory.adjust',
    'inventory.history',
    'orders.view',
    'orders.update_status',
    'orders.cancel',
    'orders.note',
    'payments.view',
    'returns.view',
    'returns.manage',
    'customers.view',
    'coupons.view',
    'coupons.manage',
    'reviews.view',
    'reviews.moderate',
    'notifications.view',
  ],

  INVENTORY_MANAGER: [
    'dashboard.view',
    'products.view',
    'products.create',
    'products.update',
    'categories.view',
    'inventory.view',
    'inventory.adjust',
    'inventory.history',
    'reports.view',
    'notifications.view',
  ],

  ORDER_MANAGER: [
    'dashboard.view',
    'orders.view',
    'orders.update_status',
    'orders.cancel',
    'orders.note',
    'customers.view',
    'payments.view',
    'returns.view',
    'returns.manage',
    'refunds.view',
    'products.view',
    'inventory.view',
    'reports.view',
    'notifications.view',
  ],

  SUPPORT_STAFF: READ_ONLY_SUPPORT,
};

export interface PermissionOverrides {
  allow?: string[];
  deny?: string[];
}

/** Narrows the untyped Json column into something usable. */
export function parseOverrides(value: unknown): PermissionOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const list = (input: unknown): string[] | undefined =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string') : undefined;
  return { allow: list(record.allow), deny: list(record.deny) };
}

/** Default-matrix lookup, before any database overrides. */
export function roleHasPermission(role: StaffRole, permission: Permission): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return DEFAULT_ROLE_MATRIX[role]?.includes(permission) ?? false;
}

/**
 * The effective answer for one person.
 *
 * @param roleGrants Rows from `RolePermission` for this role, as
 *                   `{ permission: allowed }`. Absent keys fall through to the
 *                   default matrix.
 */
export function hasPermission(
  role: StaffRole,
  permission: Permission,
  roleGrants: Record<string, boolean> = {},
  overrides: PermissionOverrides = {},
): boolean {
  // An explicit personal denial beats everything, including SUPER_ADMIN, so
  // that "this one account must never issue refunds" is actually enforceable.
  if (overrides.deny?.includes(permission)) return false;
  if (overrides.allow?.includes(permission)) return true;
  if (role === 'SUPER_ADMIN') return true;
  if (permission in roleGrants) return roleGrants[permission] === true;
  return roleHasPermission(role, permission);
}

/** Every permission a person effectively holds — used to build the navigation. */
export function effectivePermissions(
  role: StaffRole,
  roleGrants: Record<string, boolean> = {},
  overrides: PermissionOverrides = {},
): Set<Permission> {
  const granted = new Set<Permission>();
  for (const permission of ALL_PERMISSIONS) {
    if (hasPermission(role, permission, roleGrants, overrides)) granted.add(permission);
  }
  return granted;
}

export const ROLE_LABELS: Record<StaffRole, { en: string; ta: string }> = {
  SUPER_ADMIN: { en: 'Owner', ta: 'உரிமையாளர்' },
  ADMIN: { en: 'Administrator', ta: 'நிர்வாகி' },
  MANAGER: { en: 'Manager', ta: 'மேலாளர்' },
  INVENTORY_MANAGER: { en: 'Inventory manager', ta: 'சரக்கு மேலாளர்' },
  ORDER_MANAGER: { en: 'Order manager', ta: 'ஆர்டர் மேலாளர்' },
  SUPPORT_STAFF: { en: 'Support staff', ta: 'ஆதரவு ஊழியர்' },
};

/** Roles a given role is allowed to create or edit. Only owners make owners. */
export function assignableRoles(actor: StaffRole): StaffRole[] {
  if (actor === 'SUPER_ADMIN') {
    return [
      'SUPER_ADMIN',
      'ADMIN',
      'MANAGER',
      'INVENTORY_MANAGER',
      'ORDER_MANAGER',
      'SUPPORT_STAFF',
    ];
  }
  if (actor === 'ADMIN') {
    return ['MANAGER', 'INVENTORY_MANAGER', 'ORDER_MANAGER', 'SUPPORT_STAFF'];
  }
  return [];
}
