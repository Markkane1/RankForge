-- Dedicated Module 4 informational content workflow.
CREATE TABLE "ContentPiece" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "sourceKeywordId" TEXT,
  "topic" TEXT NOT NULL,
  "primaryKeyword" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "brief" TEXT NOT NULL,
  "draftBody" TEXT,
  "contentType" TEXT NOT NULL DEFAULT 'INFORMATIONAL',
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "plagiarismProvider" TEXT,
  "similarityScore" DOUBLE PRECISION,
  "similarityEvidence" TEXT,
  "publishedUrl" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentPiece_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentPieceStatusHistory" (
  "id" TEXT NOT NULL,
  "contentPieceId" TEXT NOT NULL,
  "oldStatus" TEXT,
  "newStatus" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContentPieceStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentPiece_clientId_primaryKeyword_key" ON "ContentPiece"("clientId", "primaryKeyword");
CREATE INDEX "ContentPiece_clientId_idx" ON "ContentPiece"("clientId");
CREATE INDEX "ContentPiece_status_idx" ON "ContentPiece"("status");
CREATE INDEX "ContentPieceStatusHistory_contentPieceId_idx" ON "ContentPieceStatusHistory"("contentPieceId");

ALTER TABLE "ContentPiece"
  ADD CONSTRAINT "ContentPiece_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentPieceStatusHistory"
  ADD CONSTRAINT "ContentPieceStatusHistory_contentPieceId_fkey"
  FOREIGN KEY ("contentPieceId") REFERENCES "ContentPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentPiece" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "ContentPiece";
CREATE POLICY "client_isolation" ON "ContentPiece"
  FOR ALL
  USING ("clientId" = current_setting('app.current_client_id', true))
  WITH CHECK ("clientId" = current_setting('app.current_client_id', true));

ALTER TABLE "ContentPieceStatusHistory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_isolation" ON "ContentPieceStatusHistory";
CREATE POLICY "client_isolation" ON "ContentPieceStatusHistory"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "ContentPiece" cp
      WHERE cp.id = "ContentPieceStatusHistory"."contentPieceId"
        AND cp."clientId" = current_setting('app.current_client_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "ContentPiece" cp
      WHERE cp.id = "ContentPieceStatusHistory"."contentPieceId"
        AND cp."clientId" = current_setting('app.current_client_id', true)
    )
  );
