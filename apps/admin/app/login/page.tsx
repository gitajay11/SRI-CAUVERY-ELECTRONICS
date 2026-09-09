import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getAdminIdentity } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { defaultRouteFor } from '@/lib/navigation';
import { LoginForm } from './LoginForm';
import { AdminMark } from '@/components/layout/AdminMark';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const identity = await getAdminIdentity();
  const { next } = await searchParams;

  if (identity) {
    const target = next?.startsWith('/') ? next : defaultRouteFor(identity.permissions);
    redirect(target);
  }

  const { t } = await getI18n();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Sign-in */}
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <AdminMark className="size-12" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">{t('auth.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('auth.subtitle')}</p>

          <Suspense>
            <LoginForm />
          </Suspense>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-sm font-medium text-slate-700">{t('auth.forgot')}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {t('auth.forgotHelp')}
            </p>
          </div>

          <p className="mt-5 text-xs text-slate-400">{t('auth.securityNote')}</p>
        </div>
      </div>

      {/* Brand panel — decorative, hidden on phones where it would only push
          the form below the fold. */}
      <div
        aria-hidden="true"
        className="relative hidden overflow-hidden bg-slate-900 lg:block"
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              'radial-gradient(50rem 30rem at 80% 10%, rgba(208,169,78,0.22), transparent 60%), radial-gradient(40rem 30rem at 10% 90%, rgba(138,106,25,0.28), transparent 60%)',
          }}
        />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <p lang="ta" className="font-tamil text-3xl font-bold text-white">
            ஸ்ரீ காவேரி மின்னணுவியல்
          </p>
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-slate-400">
            Sri Cauvery Electronics
          </p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-slate-300">
            Orders, stock, refunds and reports — the whole shop, from the counter or
            from your phone.
          </p>
        </div>
      </div>
    </div>
  );
}
