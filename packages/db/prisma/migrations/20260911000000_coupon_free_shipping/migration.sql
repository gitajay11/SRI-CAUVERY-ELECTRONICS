-- Coupons that waive delivery.
--
-- FREE_SHIPPING takes nothing off the goods: the saving shows up as a
-- delivery fee of zero, which is why `value` stays unused for this type.
ALTER TYPE "CouponType" ADD VALUE IF NOT EXISTS 'FREE_SHIPPING';
