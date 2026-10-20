import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo';
import { shopConfig, formattedAddress } from '@/lib/site';
import { LegalPage, List, Section } from '@/components/content/Prose';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description:
    'How Sri Cauvery Electronics collects, uses and protects your personal information.',
  path: '/privacy-policy',
});

const UPDATED = '2026-10-20';

export default async function PrivacyPolicyPage() {
  const { t } = await getI18n();

  return (
    <LegalPage
      title={t('footer.privacy')}
      intro="This policy explains what information we collect when you shop with Sri Cauvery Electronics, why we collect it, and the choices you have."
      updatedAt={UPDATED}
      breadcrumb={[
        { name: t('nav.home'), path: '/' },
        { name: t('footer.privacy'), path: '/privacy-policy' },
      ]}
    >
      <Section title="Who we are">
        <p>
          Sri Cauvery Electronics (ஸ்ரீ காவேரி மின்னணுவியல்) operates this website and the shop at{' '}
          {formattedAddress()}. For any privacy question, write to{' '}
          <a
            href={`mailto:${shopConfig.supportEmail}`}
            className="font-semibold text-link hover:underline"
          >
            {shopConfig.supportEmail}
          </a>{' '}
          or call {shopConfig.supportPhone}.
        </p>
      </Section>

      <Section title="Information we collect">
        <List
          items={[
            <>
              <strong>Account details</strong> — your name, email address, mobile number and
              a hashed password. We never store your password in readable form.
            </>,
            <>
              <strong>Order details</strong> — the delivery address, contact number and the
              items in each order. These are stored with the order so that we can pack,
              deliver and support it.
            </>,
            <>
              <strong>Payment information</strong> — handled entirely by our payment
              partner. Card numbers, UPI PINs and net-banking credentials never reach our
              servers and we cannot see them.
            </>,
            <>
              <strong>Technical data</strong> — a session cookie that keeps you signed in, a
              cart cookie so your basket survives a refresh, and a language preference
              cookie. We do not run advertising or cross-site tracking scripts.
            </>,
          ]}
        />
      </Section>

      <Section title="How we use it">
        <List
          items={[
            'To take payment for, pack and deliver your order.',
            'To send order confirmations and delivery updates by email or SMS.',
            'To answer your questions and handle returns or refunds.',
            'To meet our tax and accounting obligations under Indian law.',
          ]}
        />
        <p>
          We do not sell your personal information, and we do not share it with anyone
          except the delivery partner and payment gateway needed to fulfil your order.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          The site uses a small number of strictly functional cookies: a signed session
          cookie, a guest cart identifier, an applied coupon code, and your chosen language.
          All of them are set with the <code>httpOnly</code> and <code>SameSite=Lax</code>{' '}
          attributes where applicable, and none are used for advertising.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Order records are retained for eight years to satisfy Indian tax rules. Account
          details are kept until you delete the account. Cart and language cookies
          expire on their own — the cart within 180 days, the language preference within a
          year.
        </p>
      </Section>

      <Section title="Your choices">
        <List
          items={[
            'You can view and correct your details at any time from My Account.',
            'You can delete your account and personal data yourself, other than records we are legally required to retain — see below.',
            'You can unsubscribe from offer emails using the link in any such email.',
          ]}
        />
      </Section>

      <Section id="delete-account" title="Deleting your account">
        <p>
          Sign in, open{' '}
          <Link href="/account" className="font-semibold text-link hover:underline">
            {t('account.title')}
          </Link>
          , and choose <strong>Delete my account</strong> at the bottom of the page. You will be
          asked for your password, and the deletion takes effect at once.
        </p>
        <List
          items={[
            <>
              <strong>Deleted straight away</strong> — your name, email address, mobile number,
              password, saved addresses, cart, wishlist and product reviews.
            </>,
            <>
              <strong>Kept</strong> — your past orders, with the name, contact number and
              delivery address each was placed with, for eight years as Indian tax rules
              require. They are no longer linked to any account.
            </>,
          ]}
        />
        <p>
          An account cannot be deleted while an order, return or cancellation is still in
          progress; once it is complete, you can. If you cannot sign in, write to{' '}
          <a
            href={`mailto:${shopConfig.supportEmail}`}
            className="font-semibold text-link hover:underline"
          >
            {shopConfig.supportEmail}
          </a>{' '}
          from the email address on the account and we will delete it for you.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Traffic to this site is encrypted in transit. Passwords are hashed with scrypt,
          administrator routes are protected server-side, and order totals are always
          recalculated on our servers rather than trusted from the browser. No system is
          perfect; if you notice a problem, please tell us at {shopConfig.supportEmail}.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If this policy changes materially, we will update the date at the top of this page
          and, where the change affects existing orders or accounts, tell you directly. See
          also our{' '}
          <Link href="/terms" className="font-semibold text-link hover:underline">
            {t('footer.terms')}
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
