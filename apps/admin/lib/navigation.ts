import type { Permission } from '@tamizh/core/permissions';
import type { TranslationKey } from '@/i18n/en';

/**
 * The admin's navigation model.
 *
 * One definition drives the desktop sidebar, the mobile bottom bar and the
 * "More" drawer, so the three can never drift apart. Each entry names the
 * permission that reveals it — a stock clerk simply does not see Refunds.
 *
 * Hiding is presentation, not protection: every route re-checks server-side.
 */

export interface NavItem {
  href: string;
  labelKey: TranslationKey;
  /** Icon name resolved by components/layout/NavIcon. */
  icon: string;
  permission: Permission;
  /** Match child routes too (e.g. /orders/TE-1234 highlights Orders). */
  prefix?: boolean;
  /** Shown in the mobile bottom bar. At most four, plus "More". */
  mobile?: boolean;
}

export interface NavSection {
  labelKey: TranslationKey;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    labelKey: 'nav.sales',
    items: [
      {
        href: '/',
        labelKey: 'nav.dashboard',
        icon: 'dashboard',
        permission: 'dashboard.view',
        mobile: true,
      },
      {
        href: '/orders',
        labelKey: 'nav.orders',
        icon: 'receipt',
        permission: 'orders.view',
        prefix: true,
        mobile: true,
      },
      {
        href: '/payments',
        labelKey: 'nav.payments',
        icon: 'card',
        permission: 'payments.view',
        prefix: true,
      },
      {
        href: '/returns',
        labelKey: 'nav.returns',
        icon: 'rotate',
        permission: 'returns.view',
        prefix: true,
      },
      {
        href: '/refunds',
        labelKey: 'nav.refunds',
        icon: 'refund',
        permission: 'refunds.view',
        prefix: true,
      },
    ],
  },
  {
    labelKey: 'nav.catalogue',
    items: [
      {
        href: '/products',
        labelKey: 'nav.products',
        icon: 'box',
        permission: 'products.view',
        prefix: true,
        mobile: true,
      },
      {
        href: '/categories',
        labelKey: 'nav.categories',
        icon: 'grid',
        permission: 'categories.view',
        prefix: true,
      },
      {
        href: '/inventory',
        labelKey: 'nav.inventory',
        icon: 'warehouse',
        permission: 'inventory.view',
        prefix: true,
        mobile: true,
      },
      {
        href: '/coupons',
        labelKey: 'nav.coupons',
        icon: 'ticket',
        permission: 'coupons.view',
        prefix: true,
      },
      {
        href: '/reviews',
        labelKey: 'nav.reviews',
        icon: 'star',
        permission: 'reviews.view',
        prefix: true,
      },
    ],
  },
  {
    labelKey: 'nav.insights',
    items: [
      {
        href: '/customers',
        labelKey: 'nav.customers',
        icon: 'users',
        permission: 'customers.view',
        prefix: true,
      },
      {
        href: '/reports',
        labelKey: 'nav.reports',
        icon: 'file',
        permission: 'reports.view',
        prefix: true,
      },
      {
        href: '/notifications',
        labelKey: 'nav.notifications',
        icon: 'bell',
        permission: 'notifications.view',
        prefix: true,
      },
    ],
  },
  {
    labelKey: 'nav.administration',
    items: [
      {
        href: '/content',
        labelKey: 'nav.content',
        icon: 'megaphone',
        permission: 'content.manage',
        prefix: true,
      },
      {
        href: '/shipping',
        labelKey: 'nav.shipping',
        icon: 'truck',
        permission: 'shipping.manage',
        prefix: true,
      },
      {
        href: '/staff',
        labelKey: 'nav.staff',
        icon: 'shield',
        permission: 'staff.view',
        prefix: true,
      },
      {
        href: '/roles',
        labelKey: 'nav.roles',
        icon: 'sliders',
        permission: 'roles.manage',
        prefix: true,
      },
      {
        href: '/settings',
        labelKey: 'nav.settings',
        icon: 'settings',
        permission: 'settings.view',
        prefix: true,
      },
      {
        href: '/audit',
        labelKey: 'nav.audit',
        icon: 'history',
        permission: 'audit.view',
        prefix: true,
      },
    ],
  },
];

/** Only the sections and items this person may actually open. */
export function visibleNavigation(permissions: Set<Permission>): NavSection[] {
  return NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => permissions.has(item.permission)),
  })).filter((section) => section.items.length > 0);
}

/**
 * Up to four destinations for the mobile bottom bar, in declaration order.
 *
 * Whatever the role, the person gets the most useful four they can reach:
 * an order manager sees Orders first, a stock clerk sees Inventory.
 */
export function mobileNavigation(permissions: Set<Permission>): NavItem[] {
  const preferred = NAVIGATION.flatMap((section) => section.items).filter(
    (item) => item.mobile && permissions.has(item.permission),
  );
  if (preferred.length >= 4) return preferred.slice(0, 4);

  const fallback = NAVIGATION.flatMap((section) => section.items).filter(
    (item) => permissions.has(item.permission) && !preferred.includes(item),
  );
  return [...preferred, ...fallback].slice(0, 4);
}

/** The landing page for someone who cannot see the dashboard. */
export function defaultRouteFor(permissions: Set<Permission>): string {
  if (permissions.has('dashboard.view')) return '/';
  const first = NAVIGATION.flatMap((section) => section.items).find((item) =>
    permissions.has(item.permission),
  );
  return first?.href ?? '/no-access';
}

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/') return pathname === '/';
  return item.prefix ? pathname.startsWith(item.href) : pathname === item.href;
}
