import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import Link from "next/link";
import React from "react";

export default async function PortalDashboard() {
  const cookieStore = await cookies();
  const portalSession = cookieStore.get("portal-session")?.value;

  if (!portalSession) return null;

  let sessionData;
  try {
    const decrypted = await decryptSecret(portalSession);
    sessionData = JSON.parse(decrypted);
  } catch (e) {
    return null;
  }

  const clientId = sessionData.clientId;

  // 1. Fetch read-only tasks
  const tasks = await db.task.findMany({
    where: { clientId },
    orderBy: { updatedAt: "desc" },
    include: {
      assignedTo: { select: { name: true } },
    },
  });

  // 2. Fetch baseline snapshots
  const baseline = await db.baselineSnapshot.findUnique({
    where: { clientId },
  });
  const baselineData = baseline ? JSON.parse(baseline.metricsJson) : null;

  // 3. Fetch monthly reports list
  const reports = await db.monthlyReport.findMany({
    where: { clientId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  // 4. Fetch latest grid scan
  const scans = await db.geoGridScanResult.findMany({
    where: { clientId },
    orderBy: { scanDate: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-8">
      {/* ─── Metrics / Baseline Overview ─── */}
      <section>
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Campaign Baseline</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white dark:bg-slate-850 p-6 rounded-xl border shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Initial Baseline</span>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-bold text-emerald-600">
                {baselineData ? `${baselineData.initialAverageRank.toFixed(1)}` : "—"}
              </span>
              <span className="ml-1 text-xs text-slate-500">avg rank</span>
            </div>
            <span className="text-xs text-slate-400 mt-2">
              Captured: {baseline ? new Date(baseline.capturedAt).toLocaleDateString() : "Pending Onboarding"}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-850 p-6 rounded-xl border shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Search Rank</span>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-bold text-emerald-600">
                {scans[0] ? `${scans[0].averageRank.toFixed(1)}` : "—"}
              </span>
              <span className="ml-1 text-xs text-slate-500">avg rank</span>
            </div>
            <span className="text-xs text-slate-400 mt-2">
              Latest Scan: {scans[0] ? new Date(scans[0].scanDate).toLocaleDateString() : "—"}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-850 p-6 rounded-xl border shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Tasks Complete</span>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-bold text-emerald-600">
                {tasks.filter((t) => t.status === "DONE").length}
              </span>
              <span className="ml-1 text-xs text-slate-500">/ {tasks.length} total</span>
            </div>
            <span className="text-xs text-slate-400 mt-2">Active post execution</span>
          </div>
        </div>
      </section>

      {/* ─── Read-Only Tasks List ─── */}
      <section>
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">SEO Project Tasks</h2>
        <div className="bg-white dark:bg-slate-850 border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b">
                  <th className="p-4 font-semibold">Task ID</th>
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold">Module</th>
                  <th className="p-4 font-semibold">Priority</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      No campaign tasks assigned yet.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-4 font-mono text-xs text-slate-500">{task.taskId}</td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-350">{task.title}</span>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{task.description}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 font-medium">
                          {task.module}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            task.priority === "HIGH"
                              ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              : task.priority === "MEDIUM"
                              ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === "DONE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : task.status === "IN_PROGRESS"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Reports & Geo Scans Grid ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Reports Download Card */}
        <section className="bg-white dark:bg-slate-850 p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Monthly Reports</h2>
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-sm text-slate-400">No monthly reports finalized yet.</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                      SEO Report - {new Date(2000, report.month - 1).toLocaleString("default", { month: "long" })} {report.year}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 line-clamp-1">{report.headline}</span>
                  </div>
                  <a
                    href={`/api/reports/monthly?clientId=${clientId}&month=${report.month}&year=${report.year}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download PDF
                  </a>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Local Geo Grid Scans History */}
        <section className="bg-white dark:bg-slate-850 p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Local Grid Scans</h2>
          <div className="space-y-3">
            {scans.length === 0 ? (
              <p className="text-sm text-slate-400">No ranking maps scanned yet.</p>
            ) : (
              scans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{scan.keyword}</span>
                    <span className="text-xs text-slate-400 mt-0.5">Grid Size: {scan.gridSize}x{scan.gridSize}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-600">{scan.averageRank.toFixed(1)}</span>
                    <p className="text-xxs text-slate-400 mt-0.5">{new Date(scan.scanDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
