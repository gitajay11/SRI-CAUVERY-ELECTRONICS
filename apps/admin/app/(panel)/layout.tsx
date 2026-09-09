import { redirect } from 'next/navigation';
import { unreadCount } from '@/services/notifications';
import { getAdminIdentity } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getDictionary } from '@/i18n';
import { storefrontUrl } from '@/lib/env';
import { AdminProviders } from '@/components/providers/AdminProviders';
import { AdminShell } from '@/components/layout/AdminShell';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

/**
 * The authenticated shell.
 *
 * Everything inside this route group requires a valid session; the sign-in
 * page sits outside it. The guard here is the first of two — each API route
 * checks again, because a layout cannot protect a fetch made directly.
 *
 * `getAdminIdentity` re-reads the account and its permissions from the
 * database on every request, so disabling someone or changing a role takes
 * effect on their very next page view.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect('/login?reason=expired');

  // A forced password reset blocks everything except the change-password page.
  if (identity.mustChangePassword) redirect('/account/password?forced=1');

  const { locale } = await getI18n();

  // Through the service, so the bell badge counts exactly what the
  // notifications page will show — including the role filter.
  const unread = identity.permissions.has('notifications.view')
    ? await unreadCount(identity.id, identity.role)
    : 0;

  return (
    <AdminProviders
      locale={locale}
      dictionary={getDictionary(locale)}
      session={{
        id: identity.id,
        name: identity.name,
        email: identity.email,
        role: identity.role,
        permissions: [...identity.permissions],
      }}
    >
      <AdminShell storefrontUrl={storefrontUrl()} unreadCount={unread}>
        {children}
      </AdminShell>
      <ServiceWorkerRegistrar />
      <InstallPrompt />
    </AdminProviders>
  );
}
