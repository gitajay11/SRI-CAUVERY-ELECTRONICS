import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminIdentity } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { getDictionary } from '@/i18n';
import { AdminMark } from '@/components/layout/AdminMark';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';

export const metadata = { title: 'Change password' };

/**
 * Change your password.
 *
 * Deliberately outside the panel's route group. The panel layout sends anyone
 * with a forced password reset here, and if this page lived inside that layout
 * it would send them here again — for ever.
 */
export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ forced?: string }>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect('/login?reason=expired');

  const { forced } = await searchParams;
  const { t, locale } = await getI18n();
  const isForced = forced === '1' || identity.mustChangePassword;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <AdminMark className="mx-auto" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          {t('account.changePassword')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isForced ? t('account.forcedHint') : t('account.changeHint')}
        </p>
      </div>

      <div className="rounded-panel border border-slate-200 bg-surface p-5 shadow-panel">
        <ChangePasswordForm forced={isForced} dictionary={getDictionary(locale)} />
      </div>

      {!isForced ? (
        <Link
          href="/account"
          className="mt-4 text-center text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          ← {t('account.title')}
        </Link>
      ) : (
        <p className="mt-4 text-center text-xs text-slate-400">{t('auth.recordedNotice')}</p>
      )}
    </main>
  );
}
