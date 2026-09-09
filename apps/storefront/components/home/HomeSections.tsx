import Link from 'next/link';
import type { Locale } from '@tamizh/core/types';
import { TESTIMONIALS } from '@/lib/storefront-content';
import { shopConfig, whatsappLink } from '@/lib/site';
import { getI18n } from '@/i18n/server';
import { ButtonLink } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/Primitives';
import {
  GiftIcon,
  HeadsetIcon,
  PhoneIcon,
  ShieldIcon,
  SparkleIcon,
  TagIcon,
  TruckIcon,
  WhatsAppIcon,
} from '@/components/ui/Icons';

/** "Why choose us" — the trust block. */
export async function WhyChooseUs() {
  const { t } = await getI18n();

  const reasons = [
    { icon: <SparkleIcon />, title: t('home.why.quality'), body: t('home.why.qualityBody') },
    { icon: <TagIcon />, title: t('home.why.price'), body: t('home.why.priceBody') },
    { icon: <TruckIcon />, title: t('home.why.delivery'), body: t('home.why.deliveryBody') },
    { icon: <ShieldIcon />, title: t('home.why.payments'), body: t('home.why.paymentsBody') },
    { icon: <HeadsetIcon />, title: t('home.why.support'), body: t('home.why.supportBody') },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
      {reasons.map((reason) => (
        <div
          key={reason.title}
          className="rounded-card border border-ink-100 bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover sm:p-5"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-xl text-brand-600">
            {reason.icon}
          </span>
          <h3 className="mt-3.5 text-[0.95rem] font-bold text-ink-900">{reason.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{reason.body}</p>
        </div>
      ))}
    </div>
  );
}

/** Customer testimonials, sourced from the demo data set. */
export async function Testimonials() {
  const { locale } = await getI18n();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TESTIMONIALS.map((testimonial) => (
        <figure
          key={testimonial.name}
          className="flex flex-col rounded-card border border-ink-100 bg-surface p-5 shadow-card"
        >
          <StarRating value={testimonial.rating} showValue={false} size="md" />
          <blockquote
            lang={locale}
            className="mt-3.5 flex-1 text-sm leading-relaxed text-ink-700"
          >
            “{locale === 'ta' ? testimonial.quoteTa : testimonial.quote}”
          </blockquote>
          <figcaption className="mt-4 border-t border-ink-100 pt-3.5">
            <p className="text-sm font-bold text-ink-900">{testimonial.name}</p>
            <p className="text-xs text-ink-500">
              {locale === 'ta' ? testimonial.locationTa : testimonial.location} ·{' '}
              {locale === 'ta' ? testimonial.occasionTa : testimonial.occasion}
            </p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Bulk / return gift enquiry call-to-action. */
export async function BulkEnquiryBanner() {
  const { t } = await getI18n();

  return (
    <section className="overflow-hidden rounded-card bg-ink-900 text-white">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:p-10">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-gold-300">
            <GiftIcon className="text-sm" />
            {t('contact.bulkTitle')}
          </p>
          <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">{t('home.bulk.title')}</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
            {t('home.bulk.body')}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <ButtonLink href="/contact?enquiry=bulk" variant="gold" size="lg" fullWidth>
            {t('home.bulk.cta')}
          </ButtonLink>
          <a
            href={whatsappLink(
              'Hello! I would like a quote for return gifts. Occasion: , Number of guests: , Budget per gift: ',
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-base font-semibold transition-colors hover:bg-white/20"
          >
            <WhatsAppIcon className="text-[1.15em]" />
            {t('contact.whatsapp')}
          </a>
          <a
            href={`tel:${shopConfig.supportPhone.replace(/\s/g, '')}`}
            className="flex items-center justify-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <PhoneIcon className="text-base" />
            {shopConfig.supportPhone}
          </a>
        </div>
      </div>
    </section>
  );
}

/** Promotional strip for the offers section. */
export function OfferStrip({
  locale,
  title,
  body,
  href,
  cta,
}: {
  locale: Locale;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      lang={locale}
      className="group flex items-center justify-between gap-4 rounded-card border border-gold-200 bg-gold-50 p-5 transition-colors hover:bg-gold-100 sm:p-6"
    >
      <div className="min-w-0">
        <p className="text-lg font-extrabold text-gold-700 sm:text-xl">{title}</p>
        <p className="mt-1 text-sm text-ink-600">{body}</p>
      </div>
      <span className="shrink-0 rounded-full bg-gold-500 px-4 py-2.5 text-sm font-bold text-ink-900 transition-transform group-hover:translate-x-0.5">
        {cta} →
      </span>
    </Link>
  );
}
