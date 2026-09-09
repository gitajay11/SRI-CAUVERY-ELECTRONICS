import type {
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ReturnStatus,
} from '@tamizh/db/enums';
import { Badge, type BadgeTone } from '@/components/ui/Primitives';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/i18n/config';

/**
 * Status badges.
 *
 * Colour is assigned by meaning, not by position in the enum, and the same
 * meaning always gets the same colour across orders, payments, returns and
 * refunds — so "green is settled, red needs attention" holds everywhere.
 *
 * These are server components taking an explicit locale, so status text
 * renders without shipping the dictionary to the browser.
 */

export function orderStatusTone(status: OrderStatus): BadgeTone {
  switch (status) {
    case 'DELIVERED':
      return 'positive';
    case 'CANCELLED':
    case 'RETURNED':
    case 'RETURN_REQUESTED':
      return 'critical';
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
      return 'info';
    case 'REFUNDED':
      return 'neutral';
    default:
      return 'caution';
  }
}

export function paymentStatusTone(status: PaymentStatus): BadgeTone {
  if (status === 'PAID') return 'positive';
  if (status === 'FAILED') return 'critical';
  if (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') return 'neutral';
  return 'caution';
}

export function returnStatusTone(status: ReturnStatus): BadgeTone {
  if (status === 'REFUNDED' || status === 'CLOSED') return 'positive';
  if (status === 'REJECTED') return 'critical';
  if (status === 'RECEIVED' || status === 'APPROVED') return 'info';
  return 'caution';
}

export function refundStatusTone(status: RefundStatus): BadgeTone {
  if (status === 'COMPLETED') return 'positive';
  if (status === 'REJECTED' || status === 'FAILED') return 'critical';
  if (status === 'APPROVED' || status === 'PROCESSING') return 'info';
  return 'caution';
}

export function OrderStatusBadge({
  status,
  locale,
}: {
  status: OrderStatus;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  return (
    <Badge tone={orderStatusTone(status)}>
      {dict[`status.${status}` as 'status.PENDING']}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
  locale,
}: {
  status: PaymentStatus;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  return (
    <Badge tone={paymentStatusTone(status)}>
      {dict[`payment.${status}` as 'payment.PENDING']}
    </Badge>
  );
}

export function ReturnStatusBadge({
  status,
  locale,
}: {
  status: ReturnStatus;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  return (
    <Badge tone={returnStatusTone(status)}>
      {dict[`return.${status}` as 'return.REQUESTED']}
    </Badge>
  );
}

export function RefundStatusBadge({
  status,
  locale,
}: {
  status: RefundStatus;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  return (
    <Badge tone={refundStatusTone(status)}>
      {dict[`refund.${status}` as 'refund.PENDING']}
    </Badge>
  );
}
