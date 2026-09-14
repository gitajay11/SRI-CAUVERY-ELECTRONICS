-- Customer cancellation requests, judged by staff before anything changes.

-- CreateEnum
CREATE TYPE "CancellationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AdminNotificationType" ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED';

-- CreateTable
CREATE TABLE "CancellationRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "CancellationStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "refundId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CancellationRequest_requestNumber_key" ON "CancellationRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "CancellationRequest_orderId_idx" ON "CancellationRequest"("orderId");

-- CreateIndex
CREATE INDEX "CancellationRequest_userId_idx" ON "CancellationRequest"("userId");

-- CreateIndex
CREATE INDEX "CancellationRequest_status_requestedAt_idx" ON "CancellationRequest"("status", "requestedAt");

-- One open request per order. The application checks too, but two requests
-- arriving in the same instant would both pass that check; this cannot.
CREATE UNIQUE INDEX "CancellationRequest_one_pending_per_order"
    ON "CancellationRequest"("orderId")
    WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
