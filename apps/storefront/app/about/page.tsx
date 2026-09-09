import type { Metadata } from 'next';
import { getI18n } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo';
import { shopConfig, formattedAddress } from '@/lib/site';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ButtonLink } from '@/components/ui/Button';
import { BrandMark } from '@/components/layout/BrandMark';
import { WhyChooseUs } from '@/components/home/HomeSections';
import { SectionHeading } from '@/components/ui/Primitives';
import { MapPinIcon, PhoneIcon, SparkleIcon } from '@/components/ui/Icons';

export const metadata: Metadata = buildMetadata({
  title: 'About us',
  description:
    'Sri Cauvery Electronics has been serving families across Tamil Nadu since 2009 with dependable electronics, accessories and thoughtfully packed return gifts.',
  path: '/about',
});

export default async function AboutPage() {
  const { t, locale } = await getI18n();
  const years = new Date().getFullYear() - shopConfig.foundedYear;

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        trail={[
          { name: t('nav.home'), path: '/' },
          { name: t('about.title'), path: '/about' },
        ]}
      />

      <section className="overflow-hidden rounded-card bg-brand-800 p-6 text-white sm:p-10">
        <BrandMark size="lg" href={null} className="[&_span]:text-white" />
        <h1 className="mt-6 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
          {locale === 'ta' ? shopConfig.taglineTa : shopConfig.taglineEn}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-50/85">
          What began in {shopConfig.foundedYear} as a single counter selling bulbs and
          batteries on Bazaar Main Road is now a {years}-year-old shop that families across
          Tamil Nadu return to — for a charger that lasts, and for return gifts that arrive
          packed and ready to hand out.
        </p>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 text-[0.98rem] leading-relaxed text-ink-700">
          <h2 className="text-2xl font-bold text-ink-900">Our story</h2>
          <p>
            We started by fixing what people brought in — table fans, mixer motors, the
            occasional radio. Customers kept asking where to buy a cable that would not
            fray in three months, so we started stocking the ones we would use ourselves.
            That principle has not changed: if it comes back to the counter twice, it comes
            off the shelf.
          </p>
          <p>
            The gift side of the shop grew out of the same street. Families preparing for a
            wedding or a valaikaappu needed a hundred small gifts, neatly packed, at a price
            that made sense for a hundred guests. We learned to source in bulk, to pack
            properly, and to deliver before the muhurtham rather than on the day.
          </p>
          <p>
            Everything on this website is what sits on our shelves. When something is out
            of stock, the site says so, because a customer who drives to the shop for a
            product we do not have does not come back.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-card border border-ink-100 bg-surface p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink-900">
              <SparkleIcon className="text-lg text-gold-500" />
              What we sell
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>Chargers, cables, power banks and mobile accessories</li>
              <li>Earphones, neckbands and Bluetooth speakers</li>
              <li>LED bulbs, strip lights and emergency lamps</li>
              <li>Small household electricals — kettles, fans, irons</li>
              <li>
                Return gifts for weddings, birthdays, baby showers, housewarmings and
                festivals
              </li>
              <li>Corporate and bulk gifting, with logo printing on larger orders</li>
            </ul>
          </div>

          <div className="rounded-card border border-ink-100 bg-surface p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink-900">
              <MapPinIcon className="text-lg text-link" />
              {t('contact.visit')}
            </h3>
            <address className="mt-2.5 text-sm not-italic leading-relaxed text-ink-600">
              {formattedAddress()}
            </address>
            <p className="mt-2 text-sm text-ink-600">
              {locale === 'ta' ? shopConfig.hoursTa : shopConfig.hoursEn}
            </p>
            <a
              href={`tel:${shopConfig.supportPhone.replace(/\s/g, '')}`}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-link hover:underline"
            >
              <PhoneIcon className="text-base" />
              {shopConfig.supportPhone}
            </a>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading title={t('home.why.title')} />
        <WhyChooseUs />
      </section>

      <section className="mt-12 flex flex-col items-center gap-4 rounded-card border border-ink-100 bg-surface p-8 text-center">
        <h2 className="text-2xl font-bold text-ink-900">{t('home.bulk.title')}</h2>
        <p className="max-w-xl text-sm text-ink-600">{t('home.bulk.body')}</p>
        <ButtonLink href="/contact?enquiry=bulk" size="lg">
          {t('home.bulk.cta')}
        </ButtonLink>
      </section>
    </div>
  );
}
