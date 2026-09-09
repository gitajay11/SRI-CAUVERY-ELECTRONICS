import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { THEME_COOKIE, normalizeTheme } from '@tamizh/core/theme';
import { Suspense } from 'react';
import { getAdminIdentity } from '@/lib/session';
import { getI18n } from '@/i18n/server';
import { defaultRouteFor } from '@/lib/navigation';
import { LoginForm } from './LoginForm';
import { AdminMark } from '@/components/layout/AdminMark';
import { ThemeControl } from '@/components/layout/ThemeControl';
import { LockIcon } from '@/components/ui/Icons';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

/**
 * Staff sign-in.
 *
 * Two columns on a desktop, one on a phone — but the crest is present in both
 * rather than being dropped on small screens: a member of staff typing a
 * password into a browser needs to see at a glance that they are on the shop's
 * own panel and not on something that looks like it.
 *
 * The brand column is carbon and gold in either theme. It is the crest, not a
 * surface, so it does not follow the light/dark ramp.
 */
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
  const theme = normalizeTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,1.1fr)]">
      {/* ---- The form ---------------------------------------------------- */}
      <div className="order-2 flex flex-col px-5 py-8 sm:px-8 lg:order-1 lg:justify-center lg:px-12">
        <div className="mx-auto flex w-full max-w-sm flex-col">
          {/* On a phone the crest sits above the form; on a desktop the brand
              column carries it, so this copy is hidden there. */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <AdminMark className="size-11 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                Sri Cauvery Admin
              </p>
              <p lang="ta" className="truncate font-tamil text-xs text-slate-500">
                ஸ்ரீ காவேரி மின்னணுவியல்
              </p>
            </div>
          </div>

          <AdminMark className="hidden size-12 lg:block" />

          <h1 className="mt-0 text-2xl font-bold text-slate-900 lg:mt-6">
            {t('auth.title')}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">{t('auth.subtitle')}</p>

          <Suspense>
            <LoginForm />
          </Suspense>

          <details className="group mt-6 rounded-lg border border-slate-200 bg-slate-50 open:bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 text-sm font-medium text-slate-700 marker:content-none">
              {t('auth.forgot')}
              <span
                aria-hidden="true"
                className="text-slate-400 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="px-3.5 pb-3 text-xs leading-relaxed text-slate-500">
              {t('auth.forgotHelp')}
            </p>
          </details>

          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
            <LockIcon aria-hidden="true" className="mt-0.5 shrink-0 text-[1.05em]" />
            {t('auth.securityNote')}
          </p>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <span className="text-xs font-medium text-slate-500">
              {t('theme.label')}
            </span>
            <ThemeControl
              current={theme}
              label={t('theme.label')}
              labels={{
                system: t('theme.system'),
                light: t('theme.light'),
                dark: t('theme.dark'),
              }}
            />
          </div>
        </div>
      </div>

      {/* ---- The crest ---------------------------------------------------- */}
      <div className="on-carbon relative order-1 overflow-hidden bg-carbon-900 lg:order-2">
        {/* Two gold pools rather than a flat panel, so the black has depth
            without needing an image to download. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(45rem 28rem at 78% 8%, rgba(221,185,101,0.20), transparent 62%), radial-gradient(38rem 28rem at 8% 96%, rgba(138,106,25,0.30), transparent 60%)',
          }}
        />
        {/* A hairline of the metal along the join. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 start-0 hidden w-px bg-gradient-to-b from-transparent via-brand-500 to-transparent lg:block"
        />

        <div className="relative flex h-full flex-col justify-between gap-8 px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          <div className="flex items-center gap-3 lg:hidden">
            <AdminMark className="size-9 shrink-0" />
            <span className="text-sm font-bold text-gold-300">Sri Cauvery Admin</span>
          </div>

          <div className="hidden lg:block">
            <AdminMark className="size-14" />
          </div>

          <div>
            <p lang="ta" className="font-tamil text-2xl font-bold text-gold-300 lg:text-4xl">
              ஸ்ரீ காவேரி மின்னணுவியல்
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500 lg:text-sm">
              Sri Cauvery Electronics
            </p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600 lg:mt-6">
              Orders, stock, refunds and reports — the whole shop, from the counter or
              from your phone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
