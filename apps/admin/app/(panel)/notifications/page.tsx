import Link from 'next/link';
import { formatDate } from '@tamizh/core/utils';
import { requirePermission } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { listNotifications } from '@/services/notifications';
import { PageHeader, Panel, Badge, EmptyState } from '@/components/ui/Primitives';
import { PushToggle } from '@/components/notifications/PushToggle';
import { MarkAllRead } from '@/components/notifications/MarkAllRead';
import { BellIcon } from '@/components/ui/Icons';

export const metadata = { title: 'Notifications' };

/** Where each kind of alert should take you. */
const DESTINATIONS: Record<string, string> = {
  NEW_ORDER: '/orders',
  PAYMENT_FAILED: '/payments?status=FAILED',
  LOW_STOCK: '/inventory?filter=low',
  OUT_OF_STOCK: '/inventory?filter=out',
  RETURN_REQUESTED: '/returns',
  REFUND_REQUESTED: '/refunds',
  NEW_CUSTOMER: '/customers',
  NEW_REVIEW: '/reviews?status=PENDING',
};

export default async function NotificationsPage() {
  const identity = await requirePermission('notifications.view');
  const { t, dict } = await getI18n();

  const items = await listNotifications(identity.id, identity.role, 50);
  const unread = items.filter((item) => !item.read).length;

  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        description={
          unread > 0 ? t('notifications.unread', { count: unread }) : t('notifications.allRead')
        }
        action={unread > 0 ? <MarkAllRead /> : null}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Panel padded={false}>
          {items.length === 0 ? (
            <EmptyState icon={<BellIcon />} title={t('notifications.empty')} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={DESTINATIONS[item.type] ?? '/'}
                    className={`flex gap-3 px-4 py-3 hover:bg-slate-50 ${
                      item.read ? '' : 'bg-brand-50/40'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        item.read ? 'bg-transparent' : 'bg-brand-500'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{item.title}</span>
                        <Badge
                          tone={
                            item.type === 'OUT_OF_STOCK' || item.type === 'PAYMENT_FAILED'
                              ? 'critical'
                              : item.type === 'LOW_STOCK'
                                ? 'caution'
                                : 'neutral'
                          }
                        >
                          {dict[
                            `notifications.type.${item.type}` as 'notifications.type.NEW_ORDER'
                          ]}
                        </Badge>
                      </span>
                      <span className="block text-sm text-slate-600">{item.body}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {formatDate(item.createdAt, true)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t('notifications.settings')}>
          <PushToggle />
        </Panel>
      </div>
    </>
  );
}
