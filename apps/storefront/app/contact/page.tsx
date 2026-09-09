import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getI18n } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo';
import { shopConfig, formattedAddress, whatsappLink } from '@/lib/site';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ContactForm } from '@/components/content/ContactForm';
import { MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from '@/components/ui/Icons';

export const metadata: Metadata = buildMetadata({
  title: 'Contact us',
  description:
    'Call, WhatsApp or write to Sri Cauvery Electronics for orders, bulk return gift enquiries and after-sales support.',
  path: '/contact',
});

export default async function ContactPage() {
  const { t, locale } = await getI18n();

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('contact.title'), path: '/contact' },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {t('contact.title')}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500 sm:text-base">{t('contact.subtitle')}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Suspense>
          <ContactForm />
        </Suspense>

        <aside className="space-y-4">
          <section className="rounded-card border border-ink-100 bg-surface p-5">
            <h2 className="text-base font-bold text-ink-900">{t('contact.call')}</h2>
            <div className="mt-3 space-y-3 text-sm">
              <a
                href={`tel:${shopConfig.supportPhone.replace(/\s/g, '')}`}
                className="flex items-center gap-2.5 font-semibold text-brand-700 hover:underline"
              >
                <PhoneIcon className="text-base" />
                {shopConfig.supportPhone}
              </a>
              <a
                href={whatsappLink('Hello! I have a question about an order.')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 font-semibold text-brand-700 hover:underline"
              >
                <WhatsAppIcon className="text-base" />
                {t('contact.whatsapp')}
              </a>
              <a
                href={`mailto:${shopConfig.supportEmail}`}
                className="flex items-center gap-2.5 break-all font-semibold text-brand-700 hover:underline"
              >
                <MailIcon className="shrink-0 text-base" />
                {shopConfig.supportEmail}
              </a>
            </div>
          </section>

          <section className="rounded-card border border-ink-100 bg-surface p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
              <MapPinIcon className="text-lg text-brand-600" />
              {t('contact.visit')}
            </h2>
            <address className="mt-2.5 text-sm not-italic leading-relaxed text-ink-600">
              {formattedAddress()}
            </address>
            <div className="mt-3 border-t border-ink-100 pt-3 text-sm">
              <p className="font-semibold text-ink-800">{t('contact.hours')}</p>
              <p className="mt-1 text-ink-600">
                {locale === 'ta' ? shopConfig.hoursTa : shopConfig.hoursEn}
              </p>
              <p className="text-ink-600">{t('contact.sunday')}</p>
            </div>
          </section>

          <section className="rounded-card border border-brand-200 bg-brand-50 p-5">
            <h2 className="text-base font-bold text-brand-800">
              {t('contact.bulkTitle')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {t('contact.bulkBody')}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
