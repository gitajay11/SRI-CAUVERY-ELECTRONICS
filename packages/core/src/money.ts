/**
 * Money helpers.
 *
 * Every amount in this codebase is an integer number of **paise**.
 * Rupees only exist at the edges: parsing admin input and rendering to screen.
 */

/** ₹1 = 100 paise. */
export const PAISE_PER_RUPEE = 100;

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * PAISE_PER_RUPEE);
}

export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const inrFormatterWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/**
 * Formats paise as an Indian-grouped rupee string, e.g. 129900 -> "₹1,299".
 * Trailing paise are only shown when the amount is not a whole rupee.
 */
export function formatINR(paise: number): string {
  const rupees = paiseToRupees(paise);
  return Number.isInteger(rupees)
    ? inrFormatter.format(rupees)
    : inrFormatterWithPaise.format(rupees);
}

/** Percentage saved off MRP, rounded down so we never overstate a discount. */
export function discountPercent(mrp: number, price: number): number {
  if (mrp <= 0 || price >= mrp) return 0;
  return Math.floor(((mrp - price) / mrp) * 100);
}

/** Absolute saving in paise. */
export function savings(mrp: number, price: number): number {
  return Math.max(0, mrp - price);
}
