/**
 * How many of a product may be bought at once.
 *
 * Most things are sold one at a time. Return gifts are not: nobody buys one
 * wedding favour, and the shop packs and prices them in fives. A product that
 * carries a minimum order quantity is sold under those rules instead —
 * at least the minimum, and from there only in multiples of the step.
 *
 * This is the one place the rule lives. The product page, the cart, the
 * checkout and the server all ask the same functions the same questions, so
 * a quantity that one screen accepts can never be one that another rejects.
 * Nothing here is bound to a category: the rule follows the product, which
 * is what the admin actually configures.
 */

/** Bulk lines are stepped in fives once past the minimum. */
export const BULK_QUANTITY_STEP = 5;

/** Ordinary sale: one at a time, capped to keep a single order sane. */
export const SINGLE_SALE_MAX = 99;

export interface QuantityRule {
  /** The smallest quantity that may be ordered. */
  min: number;
  /** Quantities above `min` must be multiples of this. */
  step: number;
  /** True when the product is sold in bulk. */
  bulk: boolean;
}

export type QuantityProblem = 'below_minimum' | 'not_a_multiple' | 'above_stock';

/** The rule a product is sold under, from what the admin set on it. */
export function quantityRuleFor(product: { minOrderQuantity: number | null }): QuantityRule {
  if (product.minOrderQuantity && product.minOrderQuantity > 0) {
    return { min: product.minOrderQuantity, step: BULK_QUANTITY_STEP, bulk: true };
  }
  return { min: 1, step: 1, bulk: false };
}

/** The first quantity a shopper should see: the minimum itself. */
export function firstQuantity(rule: QuantityRule): number {
  return roundUp(rule.min, rule);
}

/**
 * Why a quantity is not allowed, or null when it is.
 *
 * `stock` is optional because the browser does not always know it, and a
 * rule broken on the screen should be named before stock is even asked.
 */
export function quantityProblem(
  quantity: number,
  rule: QuantityRule,
  stock?: number,
): QuantityProblem | null {
  if (!Number.isInteger(quantity) || quantity < rule.min) return 'below_minimum';
  if (quantity % rule.step !== 0) return 'not_a_multiple';
  if (stock !== undefined && quantity > stock) return 'above_stock';
  return null;
}

export function isValidQuantity(quantity: number, rule: QuantityRule, stock?: number): boolean {
  return quantityProblem(quantity, rule, stock) === null;
}

/** The smallest allowed quantity at or above `quantity`. */
export function roundUp(quantity: number, rule: QuantityRule): number {
  const atLeastMin = Math.max(quantity, rule.min);
  return Math.ceil(atLeastMin / rule.step) * rule.step;
}

/**
 * The largest allowed quantity at or below `quantity`, or null when there is
 * none — stock has fallen below the minimum, and the line cannot stand.
 */
export function roundDown(quantity: number, rule: QuantityRule): number | null {
  const floored = Math.floor(quantity / rule.step) * rule.step;
  return floored >= rule.min ? floored : null;
}

/** One step up, never past what is in stock. */
export function stepUp(quantity: number, rule: QuantityRule, stock: number): number {
  const next = roundUp(quantity + 1, rule);
  return next <= stock ? next : quantity;
}

/** One step down, never below the minimum. */
export function stepDown(quantity: number, rule: QuantityRule): number {
  const next = quantity - rule.step;
  return next >= rule.min ? next : rule.min;
}

/**
 * The most that can be bought right now: stock, rounded to the rule, or the
 * ordinary cap for one-at-a-time products.
 */
export function maxQuantity(rule: QuantityRule, stock: number): number {
  if (!rule.bulk) return Math.min(stock, SINGLE_SALE_MAX);
  return roundDown(stock, rule) ?? 0;
}

/** "10, 15, 20" — the first few quantities the rule allows, for a message. */
export function exampleQuantities(rule: QuantityRule, count = 3): string {
  const first = firstQuantity(rule);
  return Array.from({ length: count }, (_, i) => first + i * rule.step).join(', ');
}
