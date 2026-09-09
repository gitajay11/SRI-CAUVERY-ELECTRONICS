import Image from 'next/image';
import Link from 'next/link';
import { getI18n } from '@/i18n/server';
import { ButtonLink } from '@/components/ui/Button';
import { BoltIcon, GiftIcon, ShieldIcon, TruckIcon } from '@/components/ui/Icons';

/**
 * Home page hero.
 *
 * The two halves of the business get equal billing: the copy speaks to
 * everyday electronics, and the product collage on the right is built from
 * real catalogue images so the hero always reflects what is actually in stock.
 */
export async function Hero({
  showcase,
}: {
  showcase: { url: string; alt: string; slug: string }[];
}) {
  const { t, locale } = await getI18n();
  const [titleLine1, titleLine2] = t('home.hero.title').split('\n');

  return (
    <section className="relative overflow-hidden bg-brand-800 text-white">
      {/* Ambient shapes — purely decorative, drawn with CSS so they cost nothing. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            'radial-gradient(60rem 32rem at 88% -10%, rgba(221,185,101,0.26), transparent 60%), radial-gradient(48rem 34rem at 6% 108%, rgba(51,39,10,0.55), transparent 62%)',
        }}
      />

      <div className="container-page relative grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-50 ring-1 ring-inset ring-white/15">
            <ShieldIcon className="text-sm text-gold-300" />
            {t('home.hero.eyebrow')}
          </p>

          <h1
            lang={locale}
            className="mt-5 text-[2.1rem] font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.4rem]"
          >
            {titleLine1}
            <br />
            <span className="text-gold-300">{titleLine2}</span>
          </h1>

          <p
            lang={locale}
            className="mt-5 max-w-lg text-[0.98rem] leading-relaxed text-brand-50/90 sm:text-lg"
          >
            {t('home.hero.subtitle')}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/shop" variant="gold" size="lg" className="sm:px-8">
              <BoltIcon className="text-[1.15em]" />
              {t('home.hero.cta')}
            </ButtonLink>
            <ButtonLink
              href="/categories/return-gifts"
              size="lg"
              className="border border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              <GiftIcon className="text-[1.15em]" />
              {t('home.hero.secondaryCta')}
            </ButtonLink>
          </div>

          <ul className="mt-8 grid grid-cols-1 gap-2.5 text-sm text-brand-50/85 sm:grid-cols-3">
            <HeroBadge icon={<TruckIcon />}>{t('home.hero.badgeDelivery')}</HeroBadge>
            <HeroBadge icon={<ShieldIcon />}>{t('home.hero.badgeCod')}</HeroBadge>
            <HeroBadge icon={<BoltIcon />}>{t('home.hero.badgeReturns')}</HeroBadge>
          </ul>
        </div>

        {/* Product collage */}
        {showcase.length >= 3 ? (
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3 sm:space-y-4">
                <ShowcaseTile item={showcase[0]!} priority className="aspect-square" />
                <ShowcaseTile item={showcase[2]!} className="aspect-[4/5]" />
              </div>
              <div className="space-y-3 pt-8 sm:space-y-4">
                <ShowcaseTile item={showcase[1]!} priority className="aspect-[4/5]" />
                {showcase[3] ? (
                  <ShowcaseTile item={showcase[3]} className="aspect-square" />
                ) : null}
              </div>
            </div>

            <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm font-bold text-brand-800 shadow-lg">
              <span className="grid size-7 place-items-center rounded-full bg-gold-400 text-ink-900">
                <BoltIcon className="text-sm" />
              </span>
              {t('brand.shortTagline')}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HeroBadge({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/12 text-sm text-gold-300">
        {icon}
      </span>
      <span className="leading-snug">{children}</span>
    </li>
  );
}

function ShowcaseTile({
  item,
  className,
  priority = false,
}: {
  item: { url: string; alt: string; slug: string };
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/product/${item.slug}`}
      className={`relative block overflow-hidden rounded-2xl bg-surface shadow-xl ring-1 ring-white/15 transition-transform duration-300 hover:scale-[1.02] ${className ?? ''}`}
    >
      <Image
        src={item.url}
        alt={item.alt}
        fill
        sizes="(max-width: 1024px) 45vw, 22vw"
        priority={priority}
        className="object-cover"
      />
    </Link>
  );
}
