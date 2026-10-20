-- Phones the mobile app registers for order updates: one Expo push token per
-- device, owned by an account and deleted with it.

-- CreateTable
CREATE TABLE "CustomerPushToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPushToken_token_key" ON "CustomerPushToken"("token");

-- CreateIndex
CREATE INDEX "CustomerPushToken_userId_idx" ON "CustomerPushToken"("userId");

-- AddForeignKey
ALTER TABLE "CustomerPushToken" ADD CONSTRAINT "CustomerPushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

