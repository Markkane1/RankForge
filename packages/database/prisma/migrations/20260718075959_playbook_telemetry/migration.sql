-- CreateTable
CREATE TABLE "PlaybookTelemetry" (
    "id" TEXT NOT NULL,
    "tacticName" TEXT NOT NULL,
    "industryNiche" TEXT,
    "successScore" DOUBLE PRECISION,
    "anonymizedData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaybookTelemetry_tacticName_idx" ON "PlaybookTelemetry"("tacticName");

-- CreateIndex
CREATE INDEX "PlaybookTelemetry_industryNiche_idx" ON "PlaybookTelemetry"("industryNiche");
