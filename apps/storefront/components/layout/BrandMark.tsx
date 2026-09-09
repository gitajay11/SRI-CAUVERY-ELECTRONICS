import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@tamizh/core/utils';

/**
 * The shop wordmark.
 *
 * The Tamil name leads — it is the name over the physical shop — with the
 * English name set beneath it. On very small screens the English line is
 * dropped rather than shrunk to an unreadable size; the alt text and the site
 * title still carry it.
 */

/**
 * The crest, from the shop's own logo.
 *
 * Rendered on its own black ground because that is how the artwork is drawn —
 * the gold has no contrast against paper. `priority` is deliberate: this sits
 * in the header on every page, so it should not arrive late.
 */
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-carbon-900 shadow-sm',
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={96}
        height={96}
        priority
        className="size-full object-contain"
      />
    </span>
  );
}

export function BrandMark({
  size = 'md',
  stacked = true,
  className,
  href = '/',
}: {
  size?: 'sm' | 'md' | 'lg';
  /** false renders the two names side by side, for wide footers. */
  stacked?: boolean;
  className?: string;
  href?: string | null;
}) {
  const glyphSize = size === 'lg' ? 'size-12' : size === 'sm' ? 'size-8' : 'size-10';
  const tamilSize =
    size === 'lg' ? 'text-xl sm:text-2xl' : size === 'sm' ? 'text-sm' : 'text-sm sm:text-lg';
  const latinSize = size === 'lg' ? 'text-sm' : 'text-[0.62rem] sm:text-xs';

  const content = (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandGlyph className={glyphSize} />
      <span
        className={cn(
          'min-w-0',
          stacked ? 'flex flex-col leading-tight' : 'flex items-baseline gap-2',
        )}
      >
        <span
          lang="ta"
          className={cn(
            'font-tamil font-bold tracking-normal text-link',
            tamilSize,
          )}
        >
          ஸ்ரீ காவேரி மின்னணுவியல்
        </span>
        {/*
          Phones show the Tamil name only. "ஸ்ரீ காவேரி மின்னணுவியல்" needs
          close to 300px to set on one line, so on a phone it already wraps to
          two; adding the English line beneath pushed the header past 150px
          deep — a third of the screen before a single product appeared. The
          page title and this link's own label still carry the English name.
        */}
        <span
          className={cn(
            'hidden font-semibold uppercase tracking-[0.16em] text-ink-500 sm:block',
            latinSize,
            stacked && 'mt-0.5',
          )}
        >
          Sri Cauvery Electronics
        </span>
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="rounded-lg transition-opacity hover:opacity-85"
      aria-label="Sri Cauvery Electronics — ஸ்ரீ காவேரி மின்னணுவியல், home page"
    >
      {content}
    </Link>
  );
}
