-- AlterTable
ALTER TABLE "GbpReview" ADD COLUMN "requiresHumanGate" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReviewAsk" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "gbpProfileId" TEXT,
    "customerName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "reviewUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "sendAfter" TIMESTAMP(3) NOT NULL,
    "reminderAfter" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "remindedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewAsk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAsk_idempotencyKey_key" ON "ReviewAsk"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ReviewAsk_clientId_idx" ON "ReviewAsk"("clientId");

-- CreateIndex
CREATE INDEX "ReviewAsk_gbpProfileId_idx" ON "ReviewAsk"("gbpProfileId");

-- CreateIndex
CREATE INDEX "ReviewAsk_status_sendAfter_idx" ON "ReviewAsk"("status", "sendAfter");

-- AddForeignKey
ALTER TABLE "ReviewAsk" ADD CONSTRAINT "ReviewAsk_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAsk" ADD CONSTRAINT "ReviewAsk_gbpProfileId_fkey" FOREIGN KEY ("gbpProfileId") REFERENCES "GbpProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
