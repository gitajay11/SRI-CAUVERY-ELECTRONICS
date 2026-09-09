'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { AlertIcon, RefreshIcon } from '@/components/ui/Icons';

/**
 * Route-level error boundary.
 *
 * The message shown is deliberately generic; the actual error goes to the
 * console (and, in production, to whatever log drain the host provides) rather
 * than onto the shopper's screen.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    console.error('[route error]', error);
  }, [error]);

  return (
    <div className="container-page py-16 lg:py-24">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-danger-50 text-3xl text-danger-500">
          <AlertIcon />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-ink-900">{t('error.title')}</h1>
        <p className="mt-2.5 text-ink-600">{t('error.body')}</p>

        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-ink-400">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RefreshIcon className="text-[1.15em]" />
            {t('common.retry')}
          </Button>
          <ButtonLink href="/" variant="outline" size="lg">
            {t('error.notFound.cta')}
          </ButtonLink>
        </div>

        <p className="mt-5 text-sm text-ink-500">
          <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
            {t('footer.contactUs')}
          </Link>
        </p>
      </div>
    </div>
  );
}
