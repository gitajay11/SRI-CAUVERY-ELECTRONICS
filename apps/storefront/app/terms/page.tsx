import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo';
import { shopConfig } from '@/lib/site';
import { LegalPage, List, Section } from '@/components/content/Prose';

export const metadata: Metadata = buildMetadata({
  title: 'Terms & Conditions',
  description:
    'The terms on which Sri Cauvery Electronics sells products through this website.',
  path: '/terms',
});

export default async function TermsPage() {
  const { t } = await getI18n();

  return (
    <LegalPage
      title={t('footer.terms')}
      intro="These terms apply whenever you place an order with Sri Cauvery Electronics through this website."
      updatedAt="2026-09-01"
      breadcrumb={[
        { name: t('nav.home'), path: '/' },
        { name: t('footer.terms'), path: '/terms' },
      ]}
    >
      <Section title="Placing an order">
        <p>
          Adding items to your cart is not an order. An order is placed when you complete
          checkout, and it is confirmed only when we send the confirmation message. Until
          then we may decline an order — for example, if the item sold out in the shop while
          it was in your cart, or if we cannot deliver to your PIN code.
        </p>
      </Section>

      <Section title="Pricing and payment">
        <List
          items={[
            'All prices are in Indian Rupees and include applicable taxes.',
            'The price charged is the one shown on the order summary at the moment you place the order. Prices may change afterwards without affecting an order already placed.',
            'Where a maximum retail price is shown struck through, it is the manufacturer’s stated MRP.',
            'We accept UPI, major credit and debit cards, net banking and cash on delivery. Cash on delivery may be unavailable for some PIN codes or high-value orders.',
            'If a product is listed at an obviously incorrect price because of a technical error, we will contact you before dispatch and either honour the correct price with your consent or cancel and refund the order in full.',
          ]}
        />
      </Section>

      <Section title="Stock and availability">
        <p>
          Stock counts shown on the site come from the same inventory as the counter. They
          are accurate at the time of display, but two people can reach the last unit at
          once; if that happens we will contact you and refund in full.
        </p>
      </Section>

      <Section title="Delivery">
        <p>
          Delivery timelines, charges and coverage are set out in our{' '}
          <Link
            href="/shipping-policy"
            className="font-semibold text-link hover:underline"
          >
            {t('footer.shipping')}
          </Link>
          .
        </p>
      </Section>

      <Section title="Returns, cancellations and refunds">
        <p>
          Your rights to cancel, return and be refunded are set out in our{' '}
          <Link
            href="/returns-policy"
            className="font-semibold text-link hover:underline"
          >
            {t('footer.returns')}
          </Link>
          . Nothing in these terms limits your rights under the Consumer Protection Act,
          2019.
        </p>
      </Section>

      <Section title="Warranty">
        <p>
          Manufacturer warranties, where stated on a product page, are provided by the
          manufacturer and serviced through their authorised centres. We will help you raise
          a claim and, for the first seven days, handle it ourselves.
        </p>
      </Section>

      <Section title="Using this website">
        <List
          items={[
            'You must be at least 18 years old to place an order, or have the consent of a parent or guardian.',
            'Keep your account password confidential. Orders placed from your signed-in account are treated as placed by you.',
            'Do not attempt to interfere with the site, scrape it at volume, or use it to place fraudulent orders.',
            'Product photography, descriptions and the shop name and logo belong to Sri Cauvery Electronics and may not be reused without permission.',
          ]}
        />
      </Section>

      <Section title="Liability">
        <p>
          We are responsible for delivering the products you ordered in the condition
          described. We are not liable for indirect or consequential losses, and our total
          liability for any order is limited to the amount you paid for it. Nothing here
          excludes liability that cannot lawfully be excluded.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of India, and the courts at Madurai, Tamil
          Nadu have jurisdiction. Our GSTIN is {shopConfig.gstin}. Questions about these
          terms can go to {shopConfig.supportEmail} or {shopConfig.supportPhone}.
        </p>
      </Section>
    </LegalPage>
  );
}
