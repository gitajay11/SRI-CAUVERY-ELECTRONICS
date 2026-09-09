import Link from 'next/link';
import { db } from '@tamizh/db';
import { formatDate } from '@tamizh/core/utils';
import { PERMISSIONS, ROLE_LABELS, type Permission } from '@tamizh/core/permissions';
import { requireAdmin } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import {
  PageHeader,
  Panel,
  Badge,
  DescriptionList,
  DescriptionRow,
} from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { EndOtherSessions } from '@/components/account/EndOtherSessions';
import { KeyIcon } from '@/components/ui/Icons';

export const metadata = { title: 'Your account' };

export default async function AccountPage() {
  const identity = await requireAdmin();
  const { t, locale } = await getI18n();

  const [account, sessions] = await Promise.all([
    db.adminUser.findUnique({
      where: { id: identity.id },
      select: { email: true, phone: true, lastLoginAt: true, lastLoginIp: true, createdAt: true },
    }),
    db.adminSession.findMany({
      where: { userId: identity.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, ip: true, userAgent: true, lastSeenAt: true, createdAt: true },
    }),
  ]);

  const permissions = [...identity.permissions].sort() as Permission[];

  return (
    <>
      <PageHeader
        title={t('account.title')}
        description={identity.name}
        action={
          <ButtonLink href="/account/password" variant="outline">
            <KeyIcon className="text-[1.1em]" />
            {t('account.changePassword')}
          </ButtonLink>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <Panel title={t('account.profile')}>
            <DescriptionList>
              <DescriptionRow label={t('common.name')}>{identity.name}</DescriptionRow>
              <DescriptionRow label={t('common.email')}>{account?.email}</DescriptionRow>
              <DescriptionRow label={t('common.phone')}>
                {account?.phone ?? '—'}
              </DescriptionRow>
              <DescriptionRow label={t('account.role')}>
                <Badge tone="brand">{ROLE_LABELS[identity.role]?.[locale]}</Badge>
              </DescriptionRow>
              <DescriptionRow label={t('account.lastSignIn')}>
                {account?.lastLoginAt ? formatDate(account.lastLoginAt, true) : '—'}
              </DescriptionRow>
            </DescriptionList>
          </Panel>

          <Panel
            title={t('account.sessions')}
            action={sessions.length > 1 ? <EndOtherSessions /> : null}
            padded={false}
          >
            <ul className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <li key={session.id} className="px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                    {session.ip ?? '—'}
                    {session.id === identity.sessionId ? (
                      <Badge tone="positive">{t('account.thisDevice')}</Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {session.userAgent ?? '—'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(session.lastSeenAt, true)}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title={t('account.permissions')}>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {permissions.map((permission) => (
              <li key={permission} className="text-sm text-slate-700">
                {PERMISSIONS[permission]}
              </li>
            ))}
          </ul>
          {identity.role !== 'SUPER_ADMIN' ? (
            <p className="mt-3 text-xs text-slate-400">
              <Link href="/staff" className="hover:text-brand-700 hover:underline">
                {t('staff.rolesHint')}
              </Link>
            </p>
          ) : null}
        </Panel>
      </div>
    </>
  );
}
