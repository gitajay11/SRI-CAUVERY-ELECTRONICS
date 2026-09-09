import type { SVGProps } from 'react';

/**
 * Category glyphs.
 *
 * Keyed by the `icon` column on Category, so the shop owner can pick an icon
 * from the admin without touching code. Unknown keys fall back to the gift
 * glyph rather than rendering a hole in the layout.
 */

const paths: Record<string, React.ReactNode> = {
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
    </>
  ),
  gift: (
    <>
      <path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path d="M3 8h18v3H3zM12 8v13" />
      <path d="M12 8S10.9 4 8.8 4a2 2 0 1 0 0 4Zm0 0s1.1-4 3.2-4a2 2 0 1 1 0 4Z" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  bolt: <path d="M13.5 3 6 13.2h5L10.5 21 18 10.8h-5Z" />,
  cable: (
    <>
      <path d="M6 3v4a3 3 0 0 0 6 0V3" />
      <path d="M9 10v5a4 4 0 0 0 8 0v-3" />
      <path d="M15 12h4v-2a2 2 0 0 0-4 0Z" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13.5" width="4" height="6.5" rx="1.8" />
      <rect x="17.5" y="13.5" width="4" height="6.5" rx="1.8" />
    </>
  ),
  speaker: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <circle cx="12" cy="8" r="2" />
      <circle cx="12" cy="15.5" r="3" />
    </>
  ),
  battery: (
    <>
      <rect x="6.5" y="4" width="11" height="17" rx="2.5" />
      <path d="M10 2h4" />
      <path d="M13 9 10 14h3l-.6 4 3.1-5.4h-3Z" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 17a6 6 0 1 1 6 0v1.5H9Z" />
      <path d="M9.5 21h5" />
    </>
  ),
  watch: (
    <>
      <rect x="7" y="6.5" width="10" height="11" rx="3" />
      <path d="M9 6.5 9.5 3h5l.5 3.5M9 17.5 9.5 21h5l.5-3.5" />
    </>
  ),
  cake: (
    <>
      <path d="M4 20.5h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z" />
      <path d="M4 16.5h16M12 12.5V9M12 6.5V5" />
    </>
  ),
  lamp: (
    <>
      <path d="M12 3v3" />
      <path d="M6.5 9.5h11L15 14H9Z" />
      <path d="M12 14v4M7 21h10l-2-3H9Z" />
    </>
  ),
  toy: (
    <>
      <circle cx="9" cy="8" r="4" />
      <rect x="5" y="13" width="14" height="8" rx="3" />
      <path d="M15 9h4" />
    </>
  ),
  baby: (
    <>
      <circle cx="12" cy="8.5" r="5" />
      <path d="M9.5 8h.01M14.5 8h.01M10.5 11a2.5 2.5 0 0 0 3 0" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  house: (
    <>
      <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M10 21v-5h4v5" />
    </>
  ),
  diya: (
    <>
      <path d="M12 4c1.6 1.8 2.4 3 2.4 4.2a2.4 2.4 0 0 1-4.8 0C9.6 7 10.4 5.8 12 4Z" />
      <path d="M3.5 13.5h17L17 20H7Z" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18" />
    </>
  ),
  kettle: (
    <>
      <path d="M7 8h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" />
      <path d="M17 10.5h2.5a1.5 1.5 0 0 1 0 3H17M9.5 8V6.5A1.5 1.5 0 0 1 11 5h2a1.5 1.5 0 0 1 1.5 1.5V8" />
    </>
  ),
  fan: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 9.8c0-3 1-5.3 3-5.3s2.4 3.3 0 5M14.2 12c3 0 5.3 1 5.3 3s-3.3 2.4-5 0M12 14.2c0 3-1 5.3-3 5.3s-2.4-3.3 0-5M9.8 12c-3 0-5.3-1-5.3-3s3.3-2.4 5 0" />
    </>
  ),
};

// `name` is omitted from SVGProps: SVG elements have their own `name`
// attribute typed as `string`, which would forbid the nullable column value.
export function CategoryIcon({
  name,
  ...props
}: { name: string | null | undefined } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  const glyph = (name && paths[name]) || paths.gift;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {glyph}
    </svg>
  );
}
