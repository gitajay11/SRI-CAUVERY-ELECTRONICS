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
 * One card on the crest's own black, on every screen. The crest sits above
 * the card, large, with the shop's name under it in Tamil — a member of staff
 * typing a password into a browser should see at a glance that this is the
 * shop's own panel and not something made to look like it, and the crest is
 * the one thing an imitation would not have.
 *
 * The ground is carbon in both themes: it is the crest's field, not a
 * surface, so it does not follow the light/dark ramp — the text on it is
 * marked `on-carbon` for that reason. The card does follow the ramp, so the
 * form reads as the rest of the panel will once signed in.
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
    <div className="relative min-h-dvh overflow-hidden bg-carbon-900">
      {/* Engraved rings spreading from behind the crest, like the lines on a
          medal's field, and two pools of gold so the black has depth. All
          drawn in CSS: nothing to download before the form can be used. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-radial-gradient(circle at 50% 18%, rgba(221,185,101,0.13) 0 1px, transparent 1px 2.25rem)',
          maskImage: 'radial-gradient(52rem 36rem at 50% 18%, #000 8%, transparent 68%)',
          WebkitMaskImage: 'radial-gradient(52rem 36rem at 50% 18%, #000 8%, transparent 68%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(40rem 26rem at 50% -6%, rgba(221,185,101,0.22), transparent 60%), radial-gradient(36rem 26rem at 6% 100%, rgba(138,106,25,0.28), transparent 60%), radial-gradient(30rem 22rem at 96% 90%, rgba(138,106,25,0.18), transparent 60%)',
        }}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
        <header className="on-carbon flex flex-col items-center text-center">
          <AdminMark className="size-20 rounded-2xl shadow-[0_0_0_1px_rgba(221,185,101,0.35),0_18px_40px_-16px_rgba(221,185,101,0.45)] sm:size-24" />
          <p lang="ta" className="mt-6 font-tamil text-[1.6rem] font-bold leading-tight text-gold-300 sm:text-3xl">
            ஸ்ரீ காவேரி மின்னணுவியல்
          </p>
          <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500 sm:text-xs">
            Sri Cauvery Electronics
          </p>
        </header>

        <section
          aria-labelledby="signin-title"
          className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-overlay motion-safe:animate-[admin-fade-in_0.4s_ease-out]"
        >
          {/* The metal: a rule of the crest's gold along the top of the card. */}
          <div
            aria-hidden="true"
            className="h-1 bg-gradient-to-r from-brand-700 via-gold-300 to-brand-700"
          />

          <div className="px-5 pb-6 pt-6 sm:px-7 sm:pt-7">
            <h1 id="signin-title" className="text-xl font-bold text-slate-900 sm:text-2xl">
              {t('auth.title')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{t('auth.subtitle')}</p>

            <Suspense>
              <LoginForm />
            </Suspense>

            <details className="group mt-5 rounded-lg border border-slate-200 bg-slate-50 open:bg-surface">
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
          </div>

          {/* The note and the theme control share a row where there is room,
              and stack on a phone, where the three-way control needs the width. */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="flex min-w-0 items-start gap-1.5 text-[0.7rem] leading-relaxed text-slate-500 sm:max-w-[16rem]">
              <LockIcon aria-hidden="true" className="mt-0.5 shrink-0 text-[1.05em]" />
              <span>{t('auth.securityNote')}</span>
            </p>
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
        </section>

        <p className="on-carbon mt-7 text-center text-xs leading-relaxed text-slate-500">
          Orders, stock, refunds and reports — the whole shop, from the counter or from
          your phone.
        </p>
      </div>
    </div>
  );
}
