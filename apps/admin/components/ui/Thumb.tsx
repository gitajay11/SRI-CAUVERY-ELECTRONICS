import { cn } from '@tamizh/core/utils';
import { assetUrl } from '@/lib/assets';
import { ImageOffIcon } from './Icons';

/**
 * A product thumbnail.
 *
 * Deliberately a plain `<img>` rather than `next/image`: these come from the
 * storefront's origin, they are never larger than a table row, and routing
 * them through this app's optimiser would make the panel's page loads depend
 * on the shop being up. A missing file falls back to a placeholder instead of
 * a broken-image glyph.
 */
export function Thumb({
  url,
  alt = '',
  size = 40,
  className,
  rounded = 'md',
}: {
  url: string | null | undefined;
  alt?: string;
  size?: number;
  className?: string;
  rounded?: 'md' | 'lg';
}) {
  const src = assetUrl(url);

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-50 text-slate-300',
        rounded === 'lg' ? 'rounded-lg' : 'rounded-md',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- see note above
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <ImageOffIcon aria-hidden="true" className="text-base" />
      )}
    </span>
  );
}
