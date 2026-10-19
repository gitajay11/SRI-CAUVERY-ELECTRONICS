import { getI18n } from '@/i18n/server';
import { shopConfig, formattedAddress, whatsappLink } from '@/lib/site';
import { buttonClass } from '@/components/ui/Button';
import {
  ClockIcon,
  DirectionsIcon,
  MapPinIcon,
  PhoneIcon,
  WhatsAppIcon,
} from '@/components/ui/Icons';

/**
 * "Visit our store": where the shop is, when it is open, how to reach it, and
 * a map.
 *
 * `#visit-store` is the target of the header and menu links, so the section
 * carries a scroll margin that clears the sticky header at each size.
 *
 * "Get directions" uses the Maps directions URL rather than the short link:
 * on a phone it opens the Google Maps app straight into navigation.
 */
export async function VisitStore() {
  const { t, locale } = await getI18n();
  const { location } = shopConfig;

  return (
    <section
      id="visit-store"
      aria-labelledby="visit-store-title"
      className="mt-10 scroll-mt-32 lg:mt-14 lg:scroll-mt-44"
    >
      <div className="grid gap-6 rounded-card border border-ink-100 bg-surface p-4 sm:p-6 md:grid-cols-2 md:items-center lg:gap-10">
        <div className="min-w-0">
          <h2 id="visit-store-title" className="text-xl font-extrabold text-ink-900 sm:text-2xl">
            {t('store.title')}
          </h2>
          <p className="mt-1.5 text-sm text-ink-500">{t('store.subtitle')}</p>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <MapPinIcon className="mt-0.5 shrink-0 text-lg text-link" />
              <div className="min-w-0">
                <p className="font-bold text-ink-900">{shopConfig.nameEn}</p>
                <address className="mt-0.5 not-italic leading-relaxed text-ink-600">
                  {formattedAddress()}
                </address>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ClockIcon className="mt-0.5 shrink-0 text-lg text-link" />
              <div className="min-w-0">
                <p className="font-semibold text-ink-800">{t('contact.hours')}</p>
                <p className="mt-0.5 text-ink-600">
                  {locale === 'ta' ? shopConfig.hoursTa : shopConfig.hoursEn}
                </p>
                <p className="text-ink-600">{t('contact.sunday')}</p>
              </div>
            </div>

            <a
              href={`tel:${shopConfig.supportPhone.replace(/\s/g, '')}`}
              className="flex items-center gap-3 font-semibold text-link hover:underline"
            >
              <PhoneIcon className="shrink-0 text-lg" />
              {shopConfig.supportPhone}
            </a>

            <a
              href={whatsappLink('Hello! I would like to visit the store.')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 font-semibold text-link hover:underline"
            >
              <WhatsAppIcon className="shrink-0 text-lg" />
              {t('contact.whatsapp')}
            </a>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <a
              href={location.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass('primary', 'md')}
            >
              <DirectionsIcon className="text-base" />
              {t('store.directions')}
            </a>
            <a
              href={location.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass('outline', 'md')}
            >
              <MapPinIcon className="text-base" />
              {t('store.openInMaps')}
            </a>
          </div>
        </div>

        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
          <iframe
            src={location.embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Sri Cauvery Electronics location"
            className="absolute inset-0 size-full border-0"
          />
        </div>
      </div>
    </section>
  );
}
