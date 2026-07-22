import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth-guard";
import { dossierFindingTaskId, parseDossierFile } from "@/lib/dossier-import";

const VALID_CLIENT_TYPES = ["SERVICE_AREA_BUSINESS", "STOREFRONT", "HYBRID"];

export async function POST(request: NextRequest) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const dossierRows = parseDossierFile(file.name, text);

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 500 });
    }

    const errors: string[] = [];
    let tasksCreated = 0;
    const clientOperations = dossierRows.map((row, index) => {
      const slugBase = row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const slug = `${slugBase}-${index + 1}`;
      const clientType = row.type?.toUpperCase();
      const tasksToCreate = row.auditFindings.map((finding, findingIndex) => {
        tasksCreated++;
        return {
          taskId: dossierFindingTaskId(row.name, finding, findingIndex + 1),
          title: `Audit Remediation: ${finding.title}`,
          description: [
            finding.description,
            finding.severity ? `Severity: ${finding.severity}` : undefined,
            finding.url ? `URL: ${finding.url}` : undefined,
          ].filter(Boolean).join("\n"),
          module: "M1",
          status: "NOT_STARTED" as const,
          priority: priorityForSeverity(finding.severity),
          requestedById: auth.user.id,
          idempotencyKey: dossierFindingTaskId(row.name, finding, findingIndex + 1),
        };
      });

      return db.client.create({
        data: {
          name: row.name,
          slug,
          organizationId: org.id,
          businessName: row.businessName,
          phone: row.phone,
          email: row.email,
          website: row.website,
          address: row.address,
          city: row.city,
          state: row.state,
          postalCode: row.postalCode,
          type: clientType && VALID_CLIENT_TYPES.includes(clientType) ? clientType as "SERVICE_AREA_BUSINESS" | "STOREFRONT" | "HYBRID" : undefined,
          notes: row.notes,
          tasks: tasksToCreate.length > 0 ? { create: tasksToCreate } : undefined
        }
      });
    });

    if (clientOperations.length === 0) {
      return NextResponse.json({ imported: 0, errors });
    }

    await db.$transaction(clientOperations);

    return NextResponse.json({ imported: clientOperations.length, tasksCreated, errors });
  } catch (error) {
    console.error("CSV import error:", error);
    const message = error instanceof Error ? error.message : "Failed to import clients";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function priorityForSeverity(severity?: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (severity === "CRITICAL") return "CRITICAL";
  if (severity === "HIGH") return "HIGH";
  if (severity === "LOW") return "LOW";
  return "MEDIUM";
}
