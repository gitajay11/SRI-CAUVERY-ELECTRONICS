/**
 * URL query helpers for the admin's list screens.
 *
 * Filters, search and pagination all live in the URL so a view is shareable,
 * bookmarkable, and survives the back button. "Orders awaiting dispatch" is a
 * link a shop owner can keep on their home screen.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function readPage(value: string | string[] | undefined, max = 10_000): number {
  const raw = first(value);
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, max) : 1;
}

/**
 * Rebuilds the current URL with some parameters changed.
 * `null` removes a parameter; changing any filter resets the page.
 */
export function buildQuery(
  basePath: string,
  current: SearchParams,
  changes: Record<string, string | number | null | undefined>,
): string {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    const single = first(value);
    if (single !== undefined && single !== '') next.set(key, single);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
  }
  if (!('page' in changes)) next.delete('page');

  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** How many filters (excluding search and paging) are currently applied. */
export function activeFilterCount(current: SearchParams, keys: string[]): number {
  return keys.filter((key) => {
    const value = first(current[key]);
    return value !== undefined && value !== '';
  }).length;
}

/** Parses a `YYYY-MM-DD` query parameter into a Date, or undefined. */
export function readDate(value: string | string[] | undefined): Date | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
