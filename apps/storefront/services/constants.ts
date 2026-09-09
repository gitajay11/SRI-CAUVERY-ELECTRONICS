/** Shop-wide tunables that both the storefront and the admin read. */

/** Stock level at or below which the admin dashboard raises a low-stock flag. */
export const LOW_STOCK_THRESHOLD = 12;

/** Products per page in the shop grid. */
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 60;

/** Rows per page in admin tables. */
export const ADMIN_PAGE_SIZE = 20;

/** Maximum units of a single product one order may contain. */
export const MAX_QUANTITY_PER_ITEM = 99;

/** How many days of revenue the dashboard trend chart covers. */
export const TREND_DAYS = 14;
