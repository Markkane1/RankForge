ALTER TABLE "ReviewAsk"
  ADD COLUMN "targetReviewUrl" TEXT,
  ADD COLUMN "shortCode" TEXT,
  ADD COLUMN "qrCodeDataUrl" TEXT,
  ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastClickedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ReviewAsk_shortCode_key" ON "ReviewAsk"("shortCode");
