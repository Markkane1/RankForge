type WorkerClient = { id: string; name: string; organizationId: string };

type TenantDb = {
  geoGridScanResult: { findMany: (args: unknown) => Promise<any[]> };
  changeLogEntry: { findMany: (args: unknown) => Promise<any[]> };
  gbpReview: { findMany: (args: unknown) => Promise<any[]> };
  leadLogEntry: { findMany: (args: unknown) => Promise<any[]> };
  siteAuditIssue: { findMany: (args: unknown) => Promise<any[]> };
};

export type AnomalyScannerDeps = {
  prisma: {
    client: { findMany: (args: unknown) => Promise<WorkerClient[]> };
    notification: {
      findFirst: (args: unknown) => Promise<unknown | null>;
      create: (args: unknown) => Promise<unknown>;
    };
    staffUser: { findMany: (args: unknown) => Promise<Array<{ id: string }>> };
  };
  withClientTenant: <T>(clientId: string, fn: (tenantDb: TenantDb) => Promise<T>) => Promise<T>;
};

type AnomalyAlert = {
  type: string;
  title: string;
  message: string;
  sourceRule: string;
  recommendedAction: string;
  dedupeKey: string;
};

async function raiseAnomalyAlert(
  deps: AnomalyScannerDeps,
  client: WorkerClient,
  alert: AnomalyAlert,
  since: Date,
) {
  const existing = await deps.prisma.notification.findFirst({
    where: { type: alert.type, dedupeKey: alert.dedupeKey, createdAt: { gte: since } },
  });
  if (existing) return 0;

  const recipients = await deps.prisma.staffUser.findMany({
    where: { isActive: true, organizationId: client.organizationId, role: { in: ['OWNER', 'COORDINATOR'] } },
  });
  const fallbackRecipients = recipients.length
    ? recipients
    : await deps.prisma.staffUser.findMany({ where: { isActive: true } });

  for (const user of fallbackRecipients) {
    await deps.prisma.notification.create({
      data: {
        userId: user.id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        sourceRule: alert.sourceRule,
        recommendedAction: alert.recommendedAction,
        dedupeKey: alert.dedupeKey,
        relatedEntityId: client.id,
        relatedEntityType: 'client',
      },
    });
  }
  return 1;
}

export async function runMetricAnomalyScanner(
  deps: AnomalyScannerDeps,
  dateKey: string,
  now = new Date(),
) {
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  let anomaliesDetected = 0;

  const clients = await deps.prisma.client.findMany({
    where: { isActive: true },
    select: { id: true, name: true, organizationId: true },
  });

  for (const client of clients) {
    const scans = await deps.withClientTenant<any[]>(client.id, (tenantDb) =>
      tenantDb.geoGridScanResult.findMany({
        where: { clientId: client.id, scanDate: { gte: fourteenDaysAgo } },
        orderBy: { scanDate: 'desc' },
      }),
    );
    const seenKeywords = new Set<string>();
    for (const latest of scans) {
      if (seenKeywords.has(latest.keyword)) continue;
      seenKeywords.add(latest.keyword);
      const previous = scans.find((scan) => scan.keyword === latest.keyword && scan.id !== latest.id);
      if (!previous) continue;
      const rankDrop = latest.averageRank - previous.averageRank;
      if (rankDrop > 5) {
        anomaliesDetected += await raiseAnomalyAlert(deps, client, {
          type: 'rank_drop_wow',
          title: 'Rank Drop Alert',
          message: `Geo-grid rank dropped by ${rankDrop.toFixed(1)} positions for "${latest.keyword}".`,
          sourceRule: 'REQ-M5-03: rank drop >5 positions WoW',
          recommendedAction: 'Review ranking changes, recent GBP edits, and competitor movement for the affected keyword.',
          dedupeKey: `anomaly:${client.id}:rank:${latest.keyword}:${dateKey}`,
        }, sevenDaysAgo);
      }
    }

    const unexplainedEdits = await deps.withClientTenant<any[]>(client.id, (tenantDb) =>
      tenantDb.changeLogEntry.findMany({
        where: { clientId: client.id, entityType: 'GbpProfile', changedById: null, createdAt: { gte: sevenDaysAgo } },
      }),
    );
    for (const edit of unexplainedEdits) {
      anomaliesDetected += await raiseAnomalyAlert(deps, client, {
        type: 'unexplained_profile_edit',
        title: 'Unexplained GBP Edit Alert',
        message: `GBP profile field "${edit.field ?? 'unknown'}" changed without an attributed user.`,
        sourceRule: 'REQ-M5-03: unexplained profile edit',
        recommendedAction: 'Review the GBP audit trail and confirm whether the edit was expected.',
        dedupeKey: `anomaly:${client.id}:profile-edit:${edit.id}`,
      }, sevenDaysAgo);
    }

    const lowStarReviews = await deps.withClientTenant<any[]>(client.id, (tenantDb) =>
      tenantDb.gbpReview.findMany({
        where: { rating: { lte: 2 }, createdAt: { gte: sevenDaysAgo }, gbpProfile: { clientId: client.id } },
      }),
    );
    for (const review of lowStarReviews) {
      anomaliesDetected += await raiseAnomalyAlert(deps, client, {
        type: 'low_star_review',
        title: 'Low-Star Review Alert',
        message: `A ${review.rating}-star review needs human handling.`,
        sourceRule: 'REQ-M5-03: review <=2 stars',
        recommendedAction: 'Draft a human-reviewed response before any reply is sent.',
        dedupeKey: `anomaly:${client.id}:review:${review.id}`,
      }, sevenDaysAgo);
    }

    const currentCalls = await deps.withClientTenant<any[]>(client.id, (tenantDb) =>
      tenantDb.leadLogEntry.findMany({
        where: { clientId: client.id, source: 'GBP_CALL', createdAt: { gte: sevenDaysAgo } },
      }),
    );
    const previousCalls = await deps.withClientTenant<any[]>(client.id, (tenantDb) =>
      tenantDb.leadLogEntry.findMany({
        where: { clientId: client.id, source: 'GBP_CALL', createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      }),
    );
    const callsDropPercent = previousCalls.length
      ? ((previousCalls.length - currentCalls.length) / previousCalls.length) * 100
      : 0;
    if (callsDropPercent > 30) {
      anomaliesDetected += await raiseAnomalyAlert(deps, client, {
        type: 'calls_down_wow',
        title: 'Calls Down Alert',
        message: `GBP calls are down ${callsDropPercent.toFixed(0)} percent week over week.`,
        sourceRule: 'REQ-M5-03: calls down >30 percent WoW',
        recommendedAction: 'Audit call tracking, GBP visibility, business hours, and recent profile changes.',
        dedupeKey: `anomaly:${client.id}:calls:${dateKey}`,
      }, sevenDaysAgo);
    }

    const siteIssues = await deps.withClientTenant<any[]>(client.id, (tenantDb) =>
      tenantDb.siteAuditIssue.findMany({
        where: {
          isResolved: false,
          issueType: { in: ['BROKEN_LINK', 'HTTP_4XX', 'HTTP_5XX', 'SCHEMA_INVALID', 'CWV_FAIL'] },
          createdAt: { gte: sevenDaysAgo },
          siteAudit: { clientId: client.id },
        },
      }),
    );
    for (const issue of siteIssues) {
      anomaliesDetected += await raiseAnomalyAlert(deps, client, {
        type: 'site_health_failure',
        title: 'Site Health Alert',
        message: `Site audit reported ${issue.issueType} on ${issue.url}.`,
        sourceRule: 'REQ-M5-03: site 4xx/5xx/schema invalid/CWV fail',
        recommendedAction: 'Fix site health blockers before reporting traffic or conversion outcomes.',
        dedupeKey: `anomaly:${client.id}:site:${issue.id}`,
      }, sevenDaysAgo);
    }
  }

  return anomaliesDetected;
}
