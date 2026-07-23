ALTER TABLE "GbpCategory"
  ADD COLUMN "attributesJson" TEXT,
  ADD COLUMN "sourceLineage" TEXT,
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
