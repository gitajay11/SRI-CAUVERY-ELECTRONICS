import type { Metadata } from 'next';
import { getI18n } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo';
import { shopConfig, whatsappLink } from '@/lib/site';
import { LegalPage, List, Section } from '@/components/content/Prose';

export const metadata: Metadata = buildMetadata({
  title: 'Return & Refund Policy',
  description:
    'Seven-day returns, replacement for damaged items, and how refunds are processed at Sri Cauvery Electronics.',
  path: '/returns-policy',
});

export default async function ReturnsPolicyPage() {
  const { t } = await getI18n();

  return (
    <LegalPage
      title={t('footer.returns')}
      intro="If something is not right, tell us within seven days of delivery and we will put it right."
      updatedAt="2026-09-01"
      breadcrumb={[
        { name: t('nav.home'), path: '/' },
        { name: t('footer.returns'), path: '/returns-policy' },
      ]}
    >
      <Section title="The seven-day window">
        <p>
          You can request a return within <strong>7 days of delivery</strong>. The product
          must be unused, in its original packaging, with all accessories, manuals, freebies
          and the invoice. Products that have been used, installed, or physically damaged
          after delivery cannot be returned.
        </p>
      </Section>

      <Section title="Damaged, defective or wrong items">
        <p>
          If a parcel arrives damaged, or the item inside is defective or not what you
          ordered, contact us within <strong>48 hours</strong> with a photograph of the item
          and the packaging. We arrange a free pickup and send a replacement, or refund you
          in full — your choice.
        </p>
        <p>
          Where possible, please record a short video while opening the parcel. It is not
          required, but it makes a damage claim much faster to settle.
        </p>
      </Section>

      <Section title="What cannot be returned">
        <List
          items={[
            'Personalised or made-to-order products, such as engraved nameplates, unless they arrive faulty.',
            'Products sold as a bulk gift set where individual pieces have been opened or distributed.',
            'Items marked "no return" on the product page.',
            'Consumables such as batteries once the seal is broken, for safety reasons.',
          ]}
        />
      </Section>

      <Section title="How to start a return">
        <List
          items={[
            'Open My Orders, find the order and note the order number.',
            <>
              Call {shopConfig.supportPhone} or message us on{' '}
              <a
                href={whatsappLink('I would like to return an item. Order number: ')}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-700 hover:underline"
              >
                WhatsApp
              </a>{' '}
              with the order number and what went wrong.
            </>,
            'We confirm the return and arrange a pickup, usually within two working days in Tamil Nadu.',
            'Keep the item packed and ready with the invoice.',
          ]}
        />
      </Section>

      <Section title="Refunds">
        <List
          items={[
            'Refunds are issued once the returned item reaches us and passes a short quality check — normally within 2 working days of receipt.',
            'Online payments are refunded to the original payment method. Banks typically credit within 5–7 working days.',
            'Cash-on-delivery orders are refunded by UPI or bank transfer to an account in your name; we will ask for the details when the return is approved.',
            'Delivery charges are refunded when the return is our fault (damaged, defective or wrong item). For a change of mind, the original delivery charge is not refunded.',
          ]}
        />
      </Section>

      <Section title="Cancellations">
        <p>
          You can cancel an order yourself from My Orders while it is still pending,
          confirmed or being packed. Once it is handed to the courier it can no longer be
          cancelled online — refuse the delivery or start a return instead. Cancelled orders
          paid online are refunded in full.
        </p>
      </Section>

      <Section title="Bulk and return gift orders">
        <p>
          Bulk orders — typically 25 pieces or more for a function — are packed to order.
          They can be cancelled free of charge up to 48 hours before the agreed dispatch
          date. After packing has started, opened or distributed sets cannot be returned,
          though we will always replace pieces that arrive damaged.
        </p>
      </Section>
    </LegalPage>
  );
}
