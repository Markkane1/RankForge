-- CreateEnum
CREATE TYPE "ExecutionRoute" AS ENUM ('API', 'PARTNER', 'HUMAN');

-- CreateTable
CREATE TABLE "CapabilityMapping" (
    "id" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "primaryRoute" "ExecutionRoute" NOT NULL DEFAULT 'API',
    "fallbackRoute" "ExecutionRoute",
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CapabilityMapping_capability_key" ON "CapabilityMapping"("capability");

-- CreateIndex
CREATE INDEX "CapabilityMapping_primaryRoute_idx" ON "CapabilityMapping"("primaryRoute");
