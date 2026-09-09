import Image from 'next/image';
import { cn } from '@tamizh/core/utils';

/**
 * The admin brand mark.
 *
 * The shop's own crest, with the bronze bar the admin icons carry. Two
 * near-identical icons sitting next to each other on a phone home screen is a
 * daily irritation, so the installed apps have to be distinguishable at a
 * glance — the bar is what does that, here and in the generated icons.
 */
export function AdminMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-lg bg-black',
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
