ALTER TABLE "LeadLogEntry"
  ADD COLUMN "gbpProfileId" TEXT,
  ADD COLUMN "providerEventId" TEXT,
  ADD COLUMN "sourceLineage" TEXT;

ALTER TABLE "LeadLogEntry"
  ADD CONSTRAINT "LeadLogEntry_gbpProfileId_fkey"
  FOREIGN KEY ("gbpProfileId") REFERENCES "GbpProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "LeadLogEntry_providerEventId_key" ON "LeadLogEntry"("providerEventId");
CREATE INDEX "LeadLogEntry_gbpProfileId_idx" ON "LeadLogEntry"("gbpProfileId");
