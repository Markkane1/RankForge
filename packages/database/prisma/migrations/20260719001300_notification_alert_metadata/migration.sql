ALTER TABLE "Notification" ADD COLUMN "sourceRule" TEXT;
ALTER TABLE "Notification" ADD COLUMN "recommendedAction" TEXT;
ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;

CREATE INDEX "Notification_dedupeKey_idx" ON "Notification"("dedupeKey");
