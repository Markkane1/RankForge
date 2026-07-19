import { PrismaClient } from '@prisma/client';

/**
 * Utility to aggregate anonymized tactic data into the PlaybookTelemetry table.
 */
export async function logPlaybookTactic(
  prisma: PrismaClient,
  params: {
    tacticName: string;
    industryNiche?: string;
    successScore?: number;
    anonymizedData?: any;
  }
) {
  return prisma.playbookTelemetry.create({
    data: {
      tacticName: params.tacticName,
      industryNiche: params.industryNiche,
      successScore: params.successScore,
      anonymizedData: params.anonymizedData ? JSON.stringify(params.anonymizedData) : null,
    },
  });
}

/**
 * Analyzes the top-performing tactics for a specific niche.
 */
export async function analyzeNichePlaybook(prisma: PrismaClient, industryNiche: string) {
  const data = await prisma.playbookTelemetry.groupBy({
    by: ['tacticName'],
    where: { industryNiche },
    _avg: { successScore: true },
    _count: { id: true },
    orderBy: {
      _avg: { successScore: 'desc' },
    },
  });

  return data;
}
