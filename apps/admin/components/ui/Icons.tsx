import type { SVGProps } from 'react';

/**
 * Inline icon set.
 *
 * Hand-rolled rather than pulled from an icon package: inlining keeps the
 * bundle free of an icon library and lets every glyph inherit `currentColor`
 * and stroke weight. Shared in spirit with the storefront's set, extended here
 * with the glyphs an operations tool needs.
 *
 * Icons are decorative by default (`aria-hidden`); pass a `title` when an icon
 * is the only content of a control.
 */

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Icon({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const CartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 3h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L20 7H6" />
    <circle cx="9.5" cy="20" r="1.4" />
    <circle cx="17.5" cy="20" r="1.4" />
  </Icon>
);

export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20.2 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13Z" />
  </Icon>
);

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </Icon>
);

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 9 7 7 7-7" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 5-7 7 7 7" />
  </Icon>
);

export const StarIcon = ({ filled, half, ...p }: IconProps & { filled?: boolean; half?: boolean }) => (
  <Icon {...p} strokeWidth={1.4} fill={filled ? 'currentColor' : 'none'}>
    {half ? (
      <defs>
        <linearGradient id="te-star-half">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
    ) : null}
    <path
      d="m12 3.6 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8Z"
      fill={half ? 'url(#te-star-half)' : undefined}
    />
  </Icon>
);

export const FilterIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 6h17M6.5 12h11M10 18h4" />
  </Icon>
);

export const SortIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2.2}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MinusIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M5 12h14" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.5 7l.8 12.1A1.9 1.9 0 0 0 9.2 21h5.6a1.9 1.9 0 0 0 1.9-1.9L17.5 7" />
  </Icon>
);

export const TruckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 6.5h10.8v10H2.5zM13.3 9.8h3.9l3.3 3.2v3.5h-7.2z" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </Icon>
);

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 5 5.8v5.4c0 4.3 2.9 7.9 7 9.3 4.1-1.4 7-5 7-9.3V5.8Z" />
    <path d="m9 12 2.2 2.2L15.2 10" />
  </Icon>
);

export const HeadsetIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" />
    <rect x="2.8" y="13.4" width="4" height="6" rx="1.6" />
    <rect x="17.2" y="13.4" width="4" height="6" rx="1.6" />
    <path d="M19.2 19.4v.6a2.4 2.4 0 0 1-2.4 2.4h-2" />
  </Icon>
);

export const TagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 11.6V4.5a1 1 0 0 1 1-1h7.1a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7Z" />
    <circle cx="8" cy="8" r="1.4" />
  </Icon>
);

export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9Z" />
    <path d="M18.5 4v3M20 5.5h-3" />
  </Icon>
);

export const BoltIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13.5 3 6 13.2h5L10.5 21 18 10.8h-5Z" />
  </Icon>
);

export const GiftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10.5h16V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
    <path d="M3 7.5h18v3H3zM12 7.5V21" />
    <path d="M12 7.5S10.8 3.5 8.6 3.5a2 2 0 0 0 0 4Zm0 0S13.2 3.5 15.4 3.5a2 2 0 0 1 0 4Z" />
  </Icon>
);

export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.2 3.5h3l1.5 3.8-2 1.4a11.5 11.5 0 0 0 5.6 5.6l1.4-2 3.8 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2Z" />
  </Icon>
);

export const MailIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.8 6.5 7.4 5.6a1.4 1.4 0 0 0 1.6 0l7.4-5.6" />
  </Icon>
);

export const MapPinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </Icon>
);

export const WhatsAppIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={1.6}>
    <path d="M20.2 11.6a8.2 8.2 0 0 1-12.1 7.2L3.8 20l1.3-4.1a8.2 8.2 0 1 1 15.1-4.3Z" />
    <path d="M9 9.2c.2-.5.4-.5.7-.5h.6c.2 0 .4 0 .6.5l.7 1.6c.1.3 0 .5-.1.7l-.4.4a.4.4 0 0 0-.1.5 5.3 5.3 0 0 0 2.6 2.3.4.4 0 0 0 .5-.1l.5-.6c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.4.5a1.7 1.7 0 0 1-1.6 1.5c-1 0-2.9-.7-4.4-2.2S8.6 11.9 8.6 11a2.9 2.9 0 0 1 .4-1.8Z" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.2M12 16.2h.01" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.8h.01" />
  </Icon>
);

export const PackageIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 4 7v10l8 4 8-4V7Z" />
    <path d="m4 7 8 4 8-4M12 11v10" />
  </Icon>
);

export const ClipboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="4.5" width="14" height="16" rx="2" />
    <path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7" />
    <path d="M9 11h6M9 15h4" />
  </Icon>
);

export const ChartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 16V11M12 16V7M16 16v-6" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19a6 6 0 0 1 12 0" />
    <path d="M16 5.4a3.2 3.2 0 0 1 0 5.2M17.5 19a6 6 0 0 0-2-4.5" />
  </Icon>
);

export const LogOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
    <path d="M15.5 8.5 19 12l-3.5 3.5M19 12H9.5" />
  </Icon>
);

export const RefreshIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 11a8 8 0 1 0-.7 4.4" />
    <path d="M20 4.5V11h-6.4" />
  </Icon>
);

export const WifiOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3.5 21 21" />
    <path d="M8.2 14.6a5.5 5.5 0 0 1 7 0M5 11.4a10 10 0 0 1 4-2.4M19 11.4a10 10 0 0 0-3.4-2.2M2 8.2a14 14 0 0 1 5-3.1M22 8.2a14 14 0 0 0-7.6-3.3" />
    <path d="M12 18.6h.01" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5v11m0 0 4-4m-4 4-4-4" />
    <path d="M4.5 17.5v1.8a1.7 1.7 0 0 0 1.7 1.7h11.6a1.7 1.7 0 0 0 1.7-1.7v-1.8" />
  </Icon>
);

export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="18" cy="5.5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="18.5" r="2.5" />
    <path d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4" />
  </Icon>
);

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.2 9.5h17.6M3.2 14.5h17.6" />
    <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
  </Icon>
);

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z" />
  </Icon>
);

export const GridIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  </Icon>
);

export const SpinnerIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    aria-hidden="true"
    className={`animate-spin ${p.className ?? ''}`}
    {...p}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const DashboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.6" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.6" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="1.6" />
  </Icon>
);

export const BoxesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 7.5 8 5.2l4.5 2.3v5L8 14.8l-4.5-2.3Z" />
    <path d="M11.5 16.5 16 14.2l4.5 2.3v5L16 23.8" />
    <path d="M11.5 7.5 16 5.2l4.5 2.3v5L16 14.8l-4.5-2.3Z" />
  </Icon>
);

export const WarehouseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9.5 12 4l9 5.5V21H3Z" />
    <path d="M7.5 21v-6h9v6M7.5 17.5h9" />
  </Icon>
);

export const ReceiptIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 3.5h14v18l-2.3-1.4-2.4 1.4-2.3-1.4-2.4 1.4L7.3 20 5 21.5Z" />
    <path d="M8.5 8.5h7M8.5 12.5h7M8.5 16h4" />
  </Icon>
);

export const RotateLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11a8 8 0 1 1 .7 4.4" />
    <path d="M4 4.5V11h6.4" />
  </Icon>
);

export const TicketIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 8.5V6.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 7v2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-7Z" />
    <path d="M14 6v2M14 11v2M14 16v2" />
  </Icon>
);

export const StarOutlineIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={1.5}>
    <path d="m12 3.6 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8Z" />
  </Icon>
);

export const FileTextIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 2.5h7.5L19 8v13.5H6Z" />
    <path d="M13.5 2.5V8H19M9 12.5h6M9 16.5h6" />
  </Icon>
);

export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z" />
    <path d="M10 19a2.2 2.2 0 0 0 4 0" />
  </Icon>
);

export const MegaphoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9.5v5a1.5 1.5 0 0 0 1.5 1.5H8l8 4.5V5L8 9.5H5.5A1.5 1.5 0 0 0 4 11Z" />
    <path d="M18.5 9.5a3.5 3.5 0 0 1 0 5" />
  </Icon>
);

export const SlidersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </Icon>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 5 5.8v5.4c0 4.3 2.9 7.9 7 9.3 4.1-1.4 7-5 7-9.3V5.8Z" />
    <path d="m9 12 2.2 2.2L15.2 10" />
  </Icon>
);

export const HistoryIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4.5V10H9" />
    <path d="M12 8v4.3l3 1.8" />
  </Icon>
);

export const PrinterIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 8.5V3.5h10v5" />
    <rect x="3.5" y="8.5" width="17" height="7.5" rx="1.8" />
    <path d="M7 13.5h10v7H7Z" />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 16V4.5m0 0-4 4m4-4 4 4" />
    <path d="M4.5 17.5v1.8a1.7 1.7 0 0 0 1.7 1.7h11.6a1.7 1.7 0 0 0 1.7-1.7v-1.8" />
  </Icon>
);

export const ExternalIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4.5h5.5V10" />
    <path d="M19.5 4.5 11 13" />
    <path d="M18 14.5v4.2a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8V7.8A1.8 1.8 0 0 1 5.3 6h4.2" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

export const ArrowUpIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M12 19V5m0 0-6 6m6-6 6 6" />
  </Icon>
);

export const ArrowDownIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M12 5v14m0 0 6-6m-6 6-6-6" />
  </Icon>
);

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const EyeOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3.5 21 21" />
    <path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.7M6.4 8A17 17 0 0 0 2.5 12S6 18 12 18a9.4 9.4 0 0 0 3.3-.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
);

export const KeyIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="12" r="4" />
    <path d="M12 12h9M18 12v3M15.5 12v2.2" />
  </Icon>
);

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
    <path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);

export const ImageOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.75" cy="8.75" r="1.4" />
    <path d="m3.5 17 4.6-4.6a2 2 0 0 1 2.8 0L15 16.6" />
    <path d="m14 15 1.6-1.6a2 2 0 0 1 2.8 0l2.1 2.1" />
  </Icon>
);

export const GripIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="6" r="1.1" fill="currentColor" />
    <circle cx="9" cy="12" r="1.1" fill="currentColor" />
    <circle cx="9" cy="18" r="1.1" fill="currentColor" />
    <circle cx="15" cy="6" r="1.1" fill="currentColor" />
    <circle cx="15" cy="12" r="1.1" fill="currentColor" />
    <circle cx="15" cy="18" r="1.1" fill="currentColor" />
  </Icon>
);

export const EditIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 6.5 3 3" />
  </Icon>
);

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.6 6.6 0 0 0 9.5 9.5Z" />
  </Icon>
);

/** Half-filled disc: the theme follows the device rather than a choice. */
export const SystemIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />
  </Icon>
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
    <path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" />
  </Icon>
);
