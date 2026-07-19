import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    // Fetch all requirements ordered by sprint, then module
    const requirements = await db.buildRequirement.findMany({
      orderBy: [
        { sprint: "asc" },
        { module: "asc" },
      ],
    });

    // Compute overall counts
    const counts = {
      total: requirements.length,
      done: 0,
      in_progress: 0,
      not_started: 0,
      blocked: 0,
      deferred: 0,
    };

    for (const req of requirements) {
      const key = req.status.toLowerCase();
      if (key in counts) {
        (counts as Record<string, number>)[key]++;
      }
    }

    // Group by sprint
    const sprintMap = new Map<number, typeof requirements>();
    for (const req of requirements) {
      const sprint = req.sprint ?? 0;
      if (!sprintMap.has(sprint)) {
        sprintMap.set(sprint, []);
      }
      sprintMap.get(sprint)!.push(req);
    }

    // Build sprint groups with their own counts
    const sprints = Array.from(sprintMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([sprint, reqs]) => {
        const sprintCounts = {
          total: reqs.length,
          done: 0,
          in_progress: 0,
          not_started: 0,
          blocked: 0,
          deferred: 0,
        };

        for (const req of reqs) {
          const key = req.status.toLowerCase();
          if (key in sprintCounts) {
            (sprintCounts as Record<string, number>)[key]++;
          }
        }

        return {
          sprint,
          requirements: reqs,
          counts: sprintCounts,
        };
      });

    return NextResponse.json({
      counts,
      sprints,
    });
  } catch (error) {
    console.error("Build status API error:", error);
    return NextResponse.json(
      { error: "Failed to load build status" },
      { status: 500 }
    );
  }
}