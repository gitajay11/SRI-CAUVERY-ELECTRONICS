import type { Metadata } from 'next';
import { getI18n } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo';
import { formatINR } from '@tamizh/core/money';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from '@tamizh/core/pricing';
import { shopConfig } from '@/lib/site';
import { LegalPage, List, Section } from '@/components/content/Prose';

export const metadata: Metadata = buildMetadata({
  title: 'Shipping Policy',
  description:
    'Delivery charges, timelines and coverage for orders from Sri Cauvery Electronics across Tamil Nadu and the rest of India.',
  path: '/shipping-policy',
});

export default async function ShippingPolicyPage() {
  const { t } = await getI18n();

  return (
    <LegalPage
      title={t('footer.shipping')}
      intro="Where we deliver, what it costs, and how long it takes."
      updatedAt="2026-09-01"
      breadcrumb={[
        { name: t('nav.home'), path: '/' },
        { name: t('footer.shipping'), path: '/shipping-policy' },
      ]}
    >
      <Section title="Delivery charges">
        <List
          items={[
            <>
              <strong>Free delivery</strong> on orders of {formatINR(FREE_SHIPPING_THRESHOLD)}{' '}
              and above, after discounts.
            </>,
            <>
              A flat {formatINR(STANDARD_SHIPPING_FEE)} applies to orders below that amount.
            </>,
            'Bulk gift orders over 50 pieces are quoted individually, and delivery within Tamil Nadu is usually included.',
          ]}
        />
      </Section>

      <Section title="Dispatch and delivery times">
        <List
          items={[
            'Orders placed before 4:00 pm on a working day are dispatched the same day; later orders go out the next working day.',
            'Madurai city: 1–2 days.',
            'Rest of Tamil Nadu: 2–4 days.',
            'Other states: 4–7 days.',
            'Made-to-order items, such as engraved nameplates, take 3 working days to produce before dispatch.',
          ]}
        />
        <p>
          These are working-day estimates. Festival weeks, heavy rain and courier strikes can
          add a day or two; if your order is running late we will call you.
        </p>
      </Section>

      <Section title="Where we deliver">
        <p>
          We deliver across India through registered courier partners and India Post. We
          currently do not ship outside India. A small number of remote PIN codes are served
          by India Post only, which can add two to three days.
        </p>
      </Section>

      <Section title="Cash on delivery">
        <p>
          Cash on delivery is available for most PIN codes on orders up to ₹10,000. If it is
          unavailable for your address, the option will not appear at checkout. Please keep
          the exact amount ready — delivery agents may not carry change.
        </p>
      </Section>

      <Section title="Tracking your order">
        <p>
          Once your parcel is handed to the courier we add the tracking number to the order,
          visible under My Orders, and send it by SMS. If a delivery attempt fails, the
          courier will normally try twice more before returning the parcel to us.
        </p>
      </Section>

      <Section title="Delivery for functions">
        <p>
          If your gifts are for a wedding or a function on a fixed date, tell us the date at
          checkout or on the phone. We plan dispatch so the parcel arrives at least two days
          ahead, and for large orders inside Tamil Nadu we can often deliver ourselves.
          Call {shopConfig.supportPhone} to arrange it.
        </p>
      </Section>
    </LegalPage>
  );
}
