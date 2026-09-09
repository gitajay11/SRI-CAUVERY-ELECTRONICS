'use client';

import { useState } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { CheckIcon, MailIcon } from '@/components/ui/Icons';

/**
 * Newsletter sign-up.
 *
 * The shop has no mailing-list provider wired up yet, so this stores the
 * address locally and shows an honest confirmation. Swap the handler for a
 * POST to your provider when one is chosen — the markup does not change.
 */
export function NewsletterForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-xl bg-success-50 px-3.5 py-3 text-sm font-medium text-success-500">
        <CheckIcon className="shrink-0 text-base" />
        {t('footer.newsletterDone')}
      </p>
    );
  }

  return (
    <form
      className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (!email.includes('@')) return;
        try {
          localStorage.setItem('te_newsletter', email);
        } catch {
          // Private browsing blocks storage; the confirmation still stands.
        }
        setDone(true);
      }}
    >
      <label className="sr-only" htmlFor="newsletter-email">
        {t('auth.email')}
      </label>
      <div className="flex flex-1 items-center gap-2 rounded-full border border-ink-200 bg-paper px-3.5">
        <MailIcon className="shrink-0 text-base text-ink-400" />
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-ink-400"
        />
      </div>
      <button
        type="submit"
        className="min-h-11 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        {t('footer.newsletterCta')}
      </button>
    </form>
  );
}
