/** The shape the coupon editor works in — strings, as typed. */
export interface CouponFormValues {
  id?: string;
  code: string;
  description: string;
  type: 'PERCENT' | 'FLAT' | 'FREE_SHIPPING';
  /** A percentage or a rupee amount, depending on `type`. */
  value: string;
  minOrder: string;
  maxDiscount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perUserLimit: string;
  isActive: boolean;
  categoryIds: string[];
}

export function emptyCoupon(): CouponFormValues {
  return {
    code: '',
    description: '',
    type: 'PERCENT',
    value: '',
    minOrder: '0',
    maxDiscount: '',
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: '',
    usageLimit: '',
    perUserLimit: '1',
    isActive: true,
    categoryIds: [],
  };
}
