import { NextRequest, NextResponse } from "next/server";
import { db, withClientTenant } from "@/lib/db";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import { MonthlyReportDocument } from "@/components/reports/monthly-report";
import { requireSession } from "@/lib/auth-guard";
import { decryptSecret } from "@/lib/crypto";
import { fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Dubai";

export async function GET(request: NextRequest) {
  const auth = await requireSession();

  try {
    const { searchParams } = new URL(request.url);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const month = parseInt(
      searchParams.get("month") || String(currentMonth),
      10,
    );
    const year = parseInt(searchParams.get("year") || String(currentYear), 10);
    const clientId = searchParams.get("clientId");
    const portalClientId = auth.ok ? null : await getPortalClientId(request);

    if (!auth.ok) {
      if (!portalClientId) return auth.response;
      if (!clientId || clientId !== portalClientId) {
        return NextResponse.json(
          { error: "Portal report access denied" },
          { status: 403 },
        );
      }
    }

    // Build timezone-aware date range for the month in Asia/Dubai
    const startDateStr = `${year}-${String(month).padStart(2, "0")}-01T00:00:00`;
    const startDate = fromZonedTime(startDateStr, TIMEZONE);

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00`;
    const endDate = new Date(
      fromZonedTime(nextMonthStr, TIMEZONE).getTime() - 1,
    );

    // If the month has already ended based on the current UTC time, we can persist the snapshot
    const canSnapshot = endDate < new Date();

    // Get all clients or specific client
    const where: Record<string, unknown> = { isActive: true };
    if (clientId) {
      where.id = clientId;
    }

    const findClients = (tenantDb: typeof db) =>
      tenantDb.client.findMany({
        where,
        include: {
          gbpProfiles: {
            include: { reviews: { select: { rating: true } } },
          },
          tasks: {
            where: {
              status: "DONE",
              completedAt: { gte: startDate, lte: endDate },
            },
            select: { status: true },
          },
          leads: {
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
            select: { source: true, value: true },
          },
          citations: {
            select: { id: true },
          },
          geoGridScans: {
            orderBy: { scanDate: "desc" },
            take: 1,
            select: { averageRank: true, keyword: true, sourceLineage: true },
          },
          competitors: {
            orderBy: { analyzedAt: "desc" },
            take: 1,
            select: { competitorName: true, sourceLineage: true },
          },
          reports: {
            where: {
              OR: [
                { month, year },
                {
                  month: month === 1 ? 12 : month - 1,
                  year: month === 1 ? year - 1 : year,
                },
              ],
            },
            take: 2,
          },
        },
      });
    const clients = clientId
      ? await withClientTenant(clientId, findClients)
      : await findClients(db);

    // Aggregate data
    const leadSourceMap: Record<string, number> = {};
    let totalLeads = 0;
    let leadValue = 0;
    let totalTasksCompleted = 0;

    const stateLabelMap: Record<string, string> = {
      ONBOARDING: "Onboarding",
      BUILD: "Build",
      GROWTH: "Growth",
      AT_RISK: "At Risk",
      PAUSED: "Paused",
    };

    const clientRows: any[] = [];

    for (const c of clients) {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;

      let kpis;

      // 1. Use Immutable Snapshot if it exists
      const currentReport = c.reports?.find(
        (r) => r.month === month && r.year === year,
      );
      const prevReport = c.reports?.find(
        (r) => r.month === prevMonth && r.year === prevYear,
      );

      if (currentReport?.kpisJson) {
        kpis = JSON.parse(currentReport.kpisJson);
      } else {
        // 2. Otherwise calculate on-the-fly
        const tasksDone = c.tasks.length;
        const leads = c.leads.length;
        const clientLeadValue = c.leads.reduce(
          (sum, l) => sum + (l.value ?? 0),
          0,
        );

        const ratings =
          c.gbpProfiles?.flatMap((p) => p.reviews.map((r) => r.rating)) ?? [];
        const avgRating =
          ratings.length > 0
            ? Number(
                (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(
                  1,
                ),
              )
            : null;

        const sourceCounts: Record<string, number> = {};
        c.leads.forEach((l) => {
          sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
        });

        const citationCount = c.citations.length;
        const latestGeoGridScan = c.geoGridScans[0] ?? null;
        const topCompetitor = c.competitors[0] ?? null;
        const searchVisibility = latestGeoGridScan
          ? Math.max(
              0,
              Math.min(
                100,
                Number((100 - latestGeoGridScan.averageRank * 5).toFixed(1)),
              ),
            )
          : 0.0;
        const whatsappLeads = sourceCounts.WHATSAPP || 0;

        // Compute trends safely to prevent zero-activity NaN crashes
        const prevKpis = prevReport?.kpisJson
          ? JSON.parse(prevReport.kpisJson)
          : null;
        const prevLeads = prevKpis?.leads || 0;
        const prevTasks = prevKpis?.tasksDone || 0;

        // Partial Month Onboarding check: Suppress comparisons if client onboarded within this target month/year
        const clientCreated = new Date(c.createdAt);
        const isOnboardedInReportMonth =
          clientCreated.getMonth() + 1 === month &&
          clientCreated.getFullYear() === year;

        const leadsTrend = isOnboardedInReportMonth
          ? 0
          : prevLeads > 0
            ? ((leads - prevLeads) / prevLeads) * 100
            : leads > 0
              ? 100
              : 0;

        const tasksTrend = isOnboardedInReportMonth
          ? 0
          : prevTasks > 0
            ? ((tasksDone - prevTasks) / prevTasks) * 100
            : tasksDone > 0
              ? 100
              : 0;

        kpis = {
          name: c.businessName || c.name,
          state: stateLabelMap[c.lifecycleState] || c.lifecycleState,
          tasksDone,
          leads,
          clientLeadValue,
          avgRating,
          sourceCounts,
          leadsTrend,
          tasksTrend,
          citationCount,
          searchVisibility,
          competitorPosition: topCompetitor?.competitorName ?? null,
          nextMonthPlan:
            tasksDone === 0
              ? "Restart delivery cadence and complete at least one client-facing optimization task."
              : searchVisibility < 50
                ? "Prioritize geo-grid rank recovery and competitor gap work."
                : "Maintain posting, review, and conversion optimization cadence.",
          whatsappSummary: `${whatsappLeads} WhatsApp lead(s) logged this month.`,
          metricLineage: {
            tasksDone: "Task rows completed inside report month",
            leads: "LeadLogEntry rows created inside report month",
            leadValue: "Sum of LeadLogEntry.value inside report month",
            avgRating: "GbpReview ratings across client GBP profiles",
            sourceCounts: "LeadLogEntry.source grouped inside report month",
            citationCount: "CitationRecord count for client",
            searchVisibility: latestGeoGridScan
              ? `Latest GeoGridScanResult averageRank for ${latestGeoGridScan.keyword}`
              : "No GeoGridScanResult available",
            competitorPosition: topCompetitor
              ? "Latest CompetitorBenchmark row"
              : "No CompetitorBenchmark available",
            whatsappSummary: "LeadLogEntry rows with source WHATSAPP",
          },
        };

        // 3. Persist Immutable Snapshot if the month is over
        if (canSnapshot) {
          const clientCalls = sourceCounts["GBP_CALL"] || 0;
          const clientDirections = sourceCounts["GBP_DIRECTIONS"] || 0;
          const clientWebsite = sourceCounts["GBP_WEBSITE"] || 0;
          const clientHeadline = `You got ${clientCalls} calls, ${clientDirections} direction requests, and ${clientWebsite} website clicks this month!`;

          await withClientTenant(c.id, (tenantDb) =>
            tenantDb.monthlyReport.create({
              data: {
                clientId: c.id,
                month,
                year,
                headline: clientHeadline,
                kpisJson: JSON.stringify(kpis),
              },
            }),
          );
        }
      }

      totalTasksCompleted += kpis.tasksDone;
      totalLeads += kpis.leads;
      leadValue += kpis.clientLeadValue || 0;

      // Aggregate sources across all clients
      if (kpis.sourceCounts) {
        for (const [source, count] of Object.entries(kpis.sourceCounts)) {
          leadSourceMap[source] =
            (leadSourceMap[source] || 0) + (count as number);
        }
      }

      clientRows.push({
        name: kpis.name,
        state: kpis.state,
        tasksDone: kpis.tasksDone,
        leads: kpis.leads,
        avgRating: kpis.avgRating,
        leadsTrend: kpis.leadsTrend || 0,
        tasksTrend: kpis.tasksTrend || 0,
        citationCount: kpis.citationCount || 0,
        searchVisibility: kpis.searchVisibility || 0.0,
        competitorPosition: kpis.competitorPosition || "None recorded",
        nextMonthPlan:
          kpis.nextMonthPlan || "Continue current delivery cadence.",
        whatsappSummary:
          kpis.whatsappSummary || "0 WhatsApp lead(s) logged this month.",
      });
    }

    const leadSources = Object.entries(leadSourceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Render PDF
    const jsx = React.createElement(MonthlyReportDocument, {
      month,
      year,
      totalClients: clientRows.length,
      totalTasksCompleted,
      totalLeads,
      leadValue,
      clients: clientRows,
      leadSources,
    });

    const pdfBytes = await pdf(jsx).toBuffer();

    return new NextResponse(new Uint8Array(pdfBytes as any), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${month}-${year}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Monthly report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}

async function getPortalClientId(request: NextRequest) {
  const token = request.cookies.get("portal-session")?.value;
  if (!token) return null;

  try {
    const session = JSON.parse(await decryptSecret(token));
    if (!session?.clientId || session.exp <= Date.now()) return null;
    return String(session.clientId);
  } catch {
    return null;
  }
}
