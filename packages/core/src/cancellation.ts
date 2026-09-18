import type { CancellationStatus, RefundStatus } from '@tamizh/db/enums';

/**
 * Where a cancellation stands, from the customer's side.
 *
 * Two records tell the story: the cancellation request, which staff approve
 * or decline, and — when money had been taken — the refund that approval
 * raises, which then moves through its own queue. Neither record alone says
 * what the customer wants to know ("is my money on its way?"), so the two are
 * read together into one stage here, and both apps show that stage rather
 * than each deriving its own.
 *
 *   REQUESTED → APPROVED → REFUND_INITIATED → REFUND_PROCESSING → REFUNDED
 *   REQUESTED → DENIED
 *
 * An approved cancellation of an unpaid (cash on delivery) order ends at
 * APPROVED: there is nothing to give back. A refund that staff rejected or
 * that failed at the bank has its own stage, so the page can say so instead
 * of leaving the customer at "processing" forever.
 */
export const CANCELLATION_STAGES = [
  'REQUESTED',
  'APPROVED',
  'DENIED',
  'REFUND_INITIATED',
  'REFUND_PROCESSING',
  'REFUNDED',
  'REFUND_FAILED',
  'REFUND_REJECTED',
] as const;

export type CancellationStage = (typeof CANCELLATION_STAGES)[number];

export interface CancellationStageInput {
  status: CancellationStatus;
  refund: { status: RefundStatus } | null;
}

export function cancellationStage(request: CancellationStageInput): CancellationStage {
  if (request.status === 'PENDING') return 'REQUESTED';
  if (request.status === 'REJECTED') return 'DENIED';

  const refund = request.refund;
  if (!refund) return 'APPROVED';
  switch (refund.status) {
    case 'PENDING':
    case 'APPROVED':
      // Raised and waiting for, or cleared by, the refunds desk. To the
      // customer both mean the same thing: it has started.
      return 'REFUND_INITIATED';
    case 'PROCESSING':
      return 'REFUND_PROCESSING';
    case 'COMPLETED':
      return 'REFUNDED';
    case 'FAILED':
      return 'REFUND_FAILED';
    case 'REJECTED':
      return 'REFUND_REJECTED';
  }
}

/** The stages an approved cancellation walks through, in order. */
export const REFUND_TRACK: readonly CancellationStage[] = [
  'REQUESTED',
  'APPROVED',
  'REFUND_INITIATED',
  'REFUND_PROCESSING',
  'REFUNDED',
];

/** The same, when no money was taken. */
export const NO_REFUND_TRACK: readonly CancellationStage[] = ['REQUESTED', 'APPROVED'];

/**
 * How far along its track a stage is, for drawing the steps. A failed or
 * rejected refund sits at the processing step — that is where it stopped.
 */
export function stageIndex(stage: CancellationStage, track: readonly CancellationStage[]): number {
  if (stage === 'REFUND_FAILED' || stage === 'REFUND_REJECTED') {
    return track.indexOf('REFUND_PROCESSING');
  }
  return track.indexOf(stage);
}

/** True for the stages that end a cancellation without the money moving. */
export function isRefundProblem(stage: CancellationStage): boolean {
  return stage === 'REFUND_FAILED' || stage === 'REFUND_REJECTED';
}
