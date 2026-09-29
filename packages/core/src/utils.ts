/** Small, dependency-free helpers shared by client and server code. */

/**
 * Joins conditional class names. Deliberately tiny — Tailwind class merging is
 * handled by writing non-conflicting classes rather than by pulling in a
 * runtime merger.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** URL-safe slug. Keeps ASCII letters, digits and dashes. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Truncates on a word boundary and appends an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// The shop's clock
// ---------------------------------------------------------------------------
//
// Times are stored as instants (UTC) and that is correct: an order event
// saved at 4:44 pm in Madurai is stored as 11:14 UTC. What went wrong was
// reading them back. Formatting without a time zone uses the zone of
// whatever machine runs the code — the servers run on UTC — so every time
// the panel printed was five and a half hours early, and every "today" and
// every order-number date began at 5:30 am.
//
// Everything a person reads, and every calendar day the shop counts by, is
// therefore pinned to India's zone here, in one place, whichever machine
// renders it.

/** The zone the shop and its customers live in. */
export const SHOP_TIME_ZONE = 'Asia/Kolkata';

/**
 * India's offset from UTC. Fixed: India has not observed daylight saving
 * since 1945, so calendar arithmetic in the shop's zone is exact without a
 * time-zone database.
 */
const SHOP_OFFSET_MS = 330 * 60_000;

const MS_PER_DAY = 86_400_000;

/** Formats a date for Indian shoppers, e.g. "8 Sep 2026" or "8 Sep 2026, 4:44 pm". */
export function formatDate(value: Date | string, withTime = false): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: SHOP_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
  }).format(date);
}

/** The shop's wall clock at an instant. Months are 0-based, as in Date. */
export function shopClock(value: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
} {
  const shifted = new Date(value.getTime() + SHOP_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
  };
}

/** The shop's calendar date at an instant, as "YYYY-MM-DD". */
export function shopDateKey(value: Date = new Date()): string {
  return new Date(value.getTime() + SHOP_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * The instant the shop's day begins, for a calendar date. Out-of-range
 * parts roll over as they do in Date.UTC, so day 0 is the month's eve.
 */
export function shopMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - SHOP_OFFSET_MS);
}

/** The instant the shop's day containing `value` began. */
export function startOfShopDay(value: Date): Date {
  const { year, month, day } = shopClock(value);
  return shopMidnight(year, month, day);
}

/** The last millisecond of the shop's day containing `value`. */
export function endOfShopDay(value: Date): Date {
  return new Date(startOfShopDay(value).getTime() + MS_PER_DAY - 1);
}

/**
 * The start of the shop's day for a "YYYY-MM-DD" string (a date input's
 * value), or null when it is not one. `new Date("2026-09-29")` would give
 * UTC midnight, which is 5:30 am here.
 */
export function parseShopDate(value: string | undefined | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  return shopMidnight(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** "2026-09-29 16:44:23" in the shop's zone, for exports and logs. */
export function formatShopTimestamp(value: Date): string {
  return new Date(value.getTime() + SHOP_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
}
