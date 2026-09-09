import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getI18n } from '@/i18n/server';
import { getSessionUser } from '@/lib/auth';
import { getRepository } from '@/services/repository';
import { buildMetadata } from '@/lib/seo';
import { formatINR } from '@tamizh/core/money';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import {
  AddressPanel,
  PasswordPanel,
  ProfilePanel,
} from '@/components/account/AccountPanels';
import { ClipboardIcon, HeartIcon, PackageIcon } from '@/components/ui/Icons';

export const metadata: Metadata = buildMetadata({
  title: 'My account',
  path: '/account',
  noIndex: true,
});

export default async function AccountPage() {
  const { t } = await getI18n();
  const user = await getSessionUser();
  if (!user) redirect('/signin?next=/account');

  const repo = getRepository();
  const [addresses, orders, wishlist] = await Promise.all([
    repo.listAddresses(user.id),
    repo.listOrdersForUser(user.id),
    repo.listWishlist(user.id),
  ]);

  const spent = orders
    .filter((order) => order.status !== 'CANCELLED')
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('account.title'), path: '/account' },
        ]}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {t('account.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{user.email}</p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          href="/orders"
          icon={<ClipboardIcon />}
          label={t('order.myOrders')}
          value={String(orders.length)}
        />
        <StatCard
          href="/wishlist"
          icon={<HeartIcon />}
          label={t('nav.wishlist')}
          value={String(wishlist.length)}
        />
        <StatCard
          href="/orders"
          icon={<PackageIcon />}
          label={t('admin.stats.sales')}
          value={formatINR(spent)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <ProfilePanel user={user} />
          <PasswordPanel />
        </div>
        <AddressPanel addresses={addresses} />
      </div>
    </div>
  );
}

function StatCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-card border border-ink-100 bg-surface p-4 transition-shadow hover:shadow-card"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-success-50 text-xl text-link">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-ink-400">
          {label}
        </span>
        <span className="block truncate text-lg font-extrabold text-ink-900">{value}</span>
      </span>
    </Link>
  );
}
