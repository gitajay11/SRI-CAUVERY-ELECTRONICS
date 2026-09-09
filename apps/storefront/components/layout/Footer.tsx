import Link from 'next/link';
import type { CategoryView } from '@tamizh/core/types';
import { getI18n } from '@/i18n/server';
import { shopConfig, formattedAddress, whatsappLink } from '@/lib/site';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NewsletterForm } from './NewsletterForm';
import {
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldIcon,
  TruckIcon,
  WhatsAppIcon,
} from '@/components/ui/Icons';

export async function Footer({ categories }: { categories: CategoryView[] }) {
  const { t, locale } = await getI18n();
  const year = new Date().getFullYear();
  const label = (category: CategoryView) =>
    locale === 'ta' ? category.nameTa : category.name;

  const shopLinks = categories
    .flatMap((category) => category.children ?? [])
    .slice(0, 8);

  return (
    <footer className="mt-16 border-t border-ink-200 bg-surface">
      {/* Reassurance strip */}
      <div className="border-b border-ink-100 bg-success-50/60">
        <div className="container-page grid gap-4 py-6 sm:grid-cols-3">
          <FooterAssurance
            icon={<TruckIcon />}
            title={t('home.why.delivery')}
            body={t('home.why.deliveryBody')}
          />
          <FooterAssurance
            icon={<ShieldIcon />}
            title={t('home.why.payments')}
            body={t('home.why.paymentsBody')}
          />
          <FooterAssurance
            icon={<PhoneIcon />}
            title={t('home.why.support')}
            body={t('home.why.supportBody')}
          />
        </div>
      </div>

      <div className="container-page py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <BrandMark size="lg" />
            <p lang={locale} className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600">
              {locale === 'ta' ? shopConfig.taglineTa : shopConfig.taglineEn}. {t('home.why.qualityBody')}
            </p>

            <address className="mt-5 space-y-2.5 text-sm not-italic text-ink-600">
              <span className="flex items-start gap-2.5">
                <MapPinIcon className="mt-0.5 shrink-0 text-base text-brand-500" />
                {formattedAddress()}
              </span>
              <a
                href={`tel:${shopConfig.supportPhone.replace(/\s/g, '')}`}
                className="flex items-center gap-2.5 hover:text-link"
              >
                <PhoneIcon className="shrink-0 text-base text-brand-500" />
                {shopConfig.supportPhone}
              </a>
              <a
                href={`mailto:${shopConfig.supportEmail}`}
                className="flex items-center gap-2.5 hover:text-link"
              >
                <MailIcon className="shrink-0 text-base text-brand-500" />
                {shopConfig.supportEmail}
              </a>
              <a
                href={whatsappLink('Hello! I would like to know more about your products.')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-link"
              >
                <WhatsAppIcon className="shrink-0 text-base text-brand-500" />
                {t('contact.whatsapp')}
              </a>
            </address>

            <div className="mt-5">
              <LanguageSwitcher variant="inline" />
            </div>
          </div>

          {/* Link columns */}
          <div className="grid gap-8 sm:grid-cols-3 lg:col-span-5">
            <FooterColumn title={t('footer.shop')}>
              {shopLinks.map((category) => (
                <FooterLink key={category.id} href={`/categories/${category.slug}`}>
                  {label(category)}
                </FooterLink>
              ))}
              <FooterLink href="/shop">{t('common.viewAll')}</FooterLink>
            </FooterColumn>

            <FooterColumn title={t('footer.help')}>
              <FooterLink href="/contact">{t('footer.contactUs')}</FooterLink>
              <FooterLink href="/orders">{t('order.myOrders')}</FooterLink>
              <FooterLink href="/shipping-policy">{t('footer.shipping')}</FooterLink>
              <FooterLink href="/returns-policy">{t('footer.returns')}</FooterLink>
            </FooterColumn>

            <FooterColumn title={t('footer.company')}>
              <FooterLink href="/about">{t('nav.about')}</FooterLink>
              <FooterLink href="/privacy-policy">{t('footer.privacy')}</FooterLink>
              <FooterLink href="/terms">{t('footer.terms')}</FooterLink>
            </FooterColumn>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-800">
              {t('footer.newsletter')}
            </h3>
            <p className="mt-2 text-sm text-ink-500">{t('footer.newsletterBody')}</p>
            <NewsletterForm />
          </div>
        </div>
      </div>

      <div className="border-t border-ink-100">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.rights', { year })}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>GSTIN {shopConfig.gstin}</span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <span>{t('footer.madeIn')} 🇮🇳</span>
          </p>
        </div>
        <p className="container-page pb-6 text-xs text-ink-400">{t('footer.payments')}</p>
      </div>
    </footer>
  );
}

function FooterAssurance({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-lg text-link shadow-sm">
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-ink-800">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{body}</p>
      </div>
    </div>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-ink-800">{title}</h3>
      <ul className="mt-3 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-ink-600 transition-colors hover:text-link"
      >
        {children}
      </Link>
    </li>
  );
}
