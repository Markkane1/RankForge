-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "BaselineSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "metricsJson" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaselineSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPortalUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "clientId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WriteAttempt" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "jobId" TEXT,
    "action" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'PENDING',
    "payload" TEXT,
    "result" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WriteAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaselineSnapshot_clientId_key" ON "BaselineSnapshot"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalUser_email_key" ON "ClientPortalUser"("email");

-- CreateIndex
CREATE INDEX "ClientPortalUser_clientId_idx" ON "ClientPortalUser"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "WriteAttempt_idempotencyKey_key" ON "WriteAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WriteAttempt_action_idx" ON "WriteAttempt"("action");

-- CreateIndex
CREATE INDEX "WriteAttempt_status_idx" ON "WriteAttempt"("status");

-- CreateIndex
CREATE INDEX "WriteAttempt_clientId_idx" ON "WriteAttempt"("clientId");

-- AddForeignKey
ALTER TABLE "BaselineSnapshot" ADD CONSTRAINT "BaselineSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPortalUser" ADD CONSTRAINT "ClientPortalUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriteAttempt" ADD CONSTRAINT "WriteAttempt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
