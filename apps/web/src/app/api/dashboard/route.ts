import { NextRequest, NextResponse } from "next/server";
import { BrightLocalClient } from "@/lib/integrations/brightlocal";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";

import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { startOfWeek } from "date-fns";

const TIMEZONE = "Asia/Dubai";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    const zonedNow = toZonedTime(now, TIMEZONE);
    let fromDate: Date;
    let toDate: Date;

    if (fromParam && toParam) {
      fromDate = fromZonedTime(`${fromParam}T00:00:00`, TIMEZONE);
      toDate = new Date(fromZonedTime(`${toParam}T00:00:00`, TIMEZONE).getTime() + 86400000 - 1);
    } else {
      // Default: last 30 days
      const year = zonedNow.getFullYear();
      const month = String(zonedNow.getMonth() + 1).padStart(2, "0");
      const day = String(zonedNow.getDate()).padStart(2, "0");
      const endOfTodayStr = `${year}-${month}-${day}T00:00:00`;
      toDate = new Date(fromZonedTime(endOfTodayStr, TIMEZONE).getTime() + 86400000 - 1);
      
      const zonedFrom = new Date(zonedNow.getTime() - 29 * 86400000);
      const fromYear = zonedFrom.getFullYear();
      const fromMonth = String(zonedFrom.getMonth() + 1).padStart(2, "0");
      const fromDay = String(zonedFrom.getDate()).padStart(2, "0");
      const startOfFromStr = `${fromYear}-${fromMonth}-${fromDay}T00:00:00`;
      fromDate = fromZonedTime(startOfFromStr, TIMEZONE);
    }

    const rangeDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Previous period for comparison (same length, shifted back)
    const prevFrom = new Date(fromDate);
    prevFrom.setDate(prevFrom.getDate() - rangeDays);
    const prevTo = new Date(toDate);
    prevTo.setDate(prevTo.getDate() - rangeDays);

    const [
      totalClients,
      clientsByState,
      tasksByStatus,
      pendingApprovalsCount,
      currentLeads,
      currentLeadsBySource,
      previousLeads,
      previousTasksCompleted,
      previousLeadValue,
      recentChangeLog,
      recentTasks,
      activeClientsCurrent,
      activeClientsPrevious,
      leadsInPeriod,
      prevLeadsInPeriod,
      // New: fetch organization ID and GBP profiles with location IDs
      organizationInfo,
      gbpProfilesWithLocation,
    ] = await Promise.all([
      // existing queries
      db.client.count(),
      db.client.groupBy({
        by: ["lifecycleState"],
        _count: { id: true },
      }),
      db.task.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      db.approvalRequest.count({
        where: { status: "PENDING" },
      }),
      db.leadLogEntry.aggregate({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _count: true,
        _sum: { value: true },
      }),
      db.leadLogEntry.groupBy({
        by: ["source"],
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _count: { id: true },
      }),
      db.leadLogEntry.aggregate({
        where: { createdAt: { gte: prevFrom, lte: prevTo } },
        _count: true,
        _sum: { value: true },
      }),
      db.task.count({
        where: { status: "DONE", updatedAt: { gte: prevFrom, lte: prevTo } },
      }),
      db.leadLogEntry.aggregate({
        where: { createdAt: { gte: prevFrom, lte: prevTo } },
        _sum: { value: true },
      }),
      db.changeLogEntry.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          client: { select: { name: true } },
        },
      }),
      db.task.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          client: { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
      }),
      db.leadLogEntry.groupBy({
        by: ["clientId"],
        where: { createdAt: { gte: fromDate, lte: toDate } },
      }),
      db.leadLogEntry.groupBy({
        by: ["clientId"],
        where: { createdAt: { gte: prevFrom, lte: prevTo } },
      }),
      db.leadLogEntry.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      db.leadLogEntry.findMany({
        where: { createdAt: { gte: prevFrom, lte: prevTo } },
        include: { client: { select: { name: true } } },
      }),
      // organizationInfo: fetch a sample organizationId for BrightLocal client
      db.client.findFirst({ select: { organizationId: true } }),
      // gbpProfilesWithLocation: all profiles that have a location ID
      db.gbpProfile.findMany({ where: { gbpLocationId: { not: null } }, select: { gbpLocationId: true } }),
    ]);





    // Current period completed tasks
    const currentTasksCompleted = tasksByStatus.find((g) => g.status === "DONE")?._count.id ?? 0;

    // Convert grouped results to key-value maps
    const clientsByStateMap: Record<string, number> = {};
    for (const group of clientsByState) {
      clientsByStateMap[group.lifecycleState] = group._count.id;
    }

    const tasksByStatusMap: Record<string, number> = {};
    for (const group of tasksByStatus) {
      tasksByStatusMap[group.status] = group._count.id;
    }

    const leadsBySourceMap: Record<string, number> = {};
    for (const group of currentLeadsBySource) {
      leadsBySourceMap[group.source] = group._count.id;
    }

    // ─── Comparison calculations ───
    const currentLeadsCount = currentLeads._count;
    const prevLeadsCount = previousLeads._count;
    const leadsChange = prevLeadsCount > 0 ? ((currentLeadsCount - prevLeadsCount) / prevLeadsCount) * 100 : (currentLeadsCount > 0 ? 100 : 0);

    const currentLeadValue = currentLeads._sum.value ?? 0;
    const prevLeadValueTotal = previousLeadValue._sum.value ?? 0;
    const leadValueChange = prevLeadValueTotal > 0 ? ((currentLeadValue - prevLeadValueTotal) / prevLeadValueTotal) * 100 : (currentLeadValue > 0 ? 100 : 0);

    const tasksCompletedChange = previousTasksCompleted > 0 ? ((currentTasksCompleted - previousTasksCompleted) / previousTasksCompleted) * 100 : (currentTasksCompleted > 0 ? 100 : 0);

    const clientsActiveChange = activeClientsPrevious.length > 0 ? ((activeClientsCurrent.length - activeClientsPrevious.length) / activeClientsPrevious.length) * 100 : (activeClientsCurrent.length > 0 ? 100 : 0);

    // ─── Leads Trend (daily or weekly) ───
    const leadsTrend: { date: string; count: number; value: number }[] = [];
    if (rangeDays > 60) {
      // Weekly grouping
      const weekMap = new Map<string, { count: number; value: number }>();
      for (const lead of leadsInPeriod) {
        const d = toZonedTime(new Date(lead.createdAt), TIMEZONE);
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth()+1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
        const existing = weekMap.get(key) ?? { count: 0, value: 0 };
        existing.count += 1;
        existing.value += lead.value ?? 0;
        weekMap.set(key, existing);
      }
      for (const [date, data] of weekMap) {
        leadsTrend.push({ date, count: data.count, value: data.value });
      }
    } else {
      // Daily grouping
      const dayMap = new Map<string, { count: number; value: number }>();
      for (const lead of leadsInPeriod) {
        const d = toZonedTime(new Date(lead.createdAt), TIMEZONE);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const existing = dayMap.get(key) ?? { count: 0, value: 0 };
        existing.count += 1;
        existing.value += lead.value ?? 0;
        dayMap.set(key, existing);
      }
      // Fill in missing days with zeros
      const cursor = new Date(fromDate);
      while (cursor <= toDate) {
        const d = toZonedTime(cursor, TIMEZONE);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const data = dayMap.get(key);
        // Avoid duplicate dates if cursor steps fall on the same day due to DST
        if (!leadsTrend.find((l) => l.date === key)) {
          leadsTrend.push({
            date: key,
            count: data?.count ?? 0,
            value: data?.value ?? 0,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // ─── Top Clients by lead value ───
    const clientLeadMap = new Map<string, { name: string; leads: number; value: number }>();
    for (const lead of leadsInPeriod) {
      const existing = clientLeadMap.get(lead.clientId) ?? { name: lead.client?.name ?? "Unknown", leads: 0, value: 0 };
      existing.leads += 1;
      existing.value += lead.value ?? 0;
      clientLeadMap.set(lead.clientId, existing);
    }

    // Previous period client lead map for trend
    const prevClientLeadMap = new Map<string, number>();
    for (const lead of prevLeadsInPeriod) {
      prevClientLeadMap.set(lead.clientId, (prevClientLeadMap.get(lead.clientId) ?? 0) + (lead.value ?? 0));
    }

    const topClients = Array.from(clientLeadMap.entries())
      .map(([id, data]) => {
        const prevValue = prevClientLeadMap.get(id) ?? 0;
        const trend = prevValue > 0 ? ((data.value - prevValue) / prevValue) * 100 : (data.value > 0 ? 100 : 0);
        return { id, name: data.name, leads: data.leads, value: data.value, trend };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

          // Compute citation metrics using BrightLocal (optional — skipped if not configured)
      let totalCitations = 0;
      let weightedScoreSum = 0;
      if (organizationInfo?.organizationId && gbpProfilesWithLocation?.length) {
        try {
          const blClient = new BrightLocalClient(organizationInfo.organizationId);
          await blClient.init();
          if (blClient.isConnected) {
            await Promise.all(gbpProfilesWithLocation.map(async (p) => {
              if (!p.gbpLocationId) return;
              try {
                const report = await blClient.getCitationTrackerReport(p.gbpLocationId);
                const citations = report.citations ?? [];
                for (const c of citations) {
                  const count = c.citationCount ?? 0;
                  const score = c.keyCitationScore ?? 0;
                  totalCitations += count;
                  weightedScoreSum += score * count;
                }
              } catch (e) {
                console.error('BrightLocal citation fetch error for location', p.gbpLocationId, e);
              }
            }));
          }
        } catch (e) {
          // ponytail: BrightLocal not configured or credentials unavailable — skip citations gracefully
          console.warn('BrightLocal init skipped (not configured):', (e as Error).message);
        }
      }
      const averageScore = totalCitations > 0 ? Math.round((weightedScoreSum / totalCitations) * 10) / 10 : 0;

      return NextResponse.json({
      totalClients,
      clientsByState: clientsByStateMap,
      tasksByStatus: tasksByStatusMap,
      pendingApprovals: pendingApprovalsCount,
      leadsThisMonth: currentLeadsCount,
      leadValueThisMonth: currentLeadValue,
      leadsBySource: leadsBySourceMap,
      recentChangeLog,
      recentTasks,
      comparison: {
        leadsChange: Math.round(leadsChange * 10) / 10,
        tasksCompletedChange: Math.round(tasksCompletedChange * 10) / 10,
        clientsActiveChange: Math.round(clientsActiveChange * 10) / 10,
        leadValueChange: Math.round(leadValueChange * 10) / 10,
      },
      leadsTrend,
      topClients,
    citationMetrics: { totalCitations, averageScore },
  });
  } catch (error) {
    console.error("Dashboard API error:", error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: "Failed to load dashboard data", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}