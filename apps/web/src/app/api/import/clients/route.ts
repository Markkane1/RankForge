import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Only CSV files are accepted" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    if (nameIdx === -1) {
      return NextResponse.json({ error: "CSV must have a 'name' column" }, { status: 400 });
    }

    const fieldMap: Record<string, number> = {};
    for (const key of ["businessname", "phone", "email", "website", "address", "city", "state", "postalcode", "type", "notes"]) {
      fieldMap[key] = headers.indexOf(key);
    }

    // Get default org
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 500 });
    }

    const auditIdx = headers.indexOf("audit_issues");

    const errors: string[] = [];
    const clientOperations = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const name = cols[nameIdx]?.trim();
      if (!name) {
        errors.push(`Row ${i + 1}: empty name, skipped`);
        continue;
      }

      const getValue = (idx: number) => (idx >= 0 && cols[idx] ? cols[idx].trim() : undefined);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();

      // REQ-M1-01: Parse audit issues into tasks
      const auditIssuesStr = getValue(auditIdx);
      const tasksToCreate = [];
      if (auditIssuesStr) {
        const issues = auditIssuesStr.split(';').map(i => i.trim()).filter(Boolean);
        for (const issue of issues) {
          tasksToCreate.push({
            taskId: `M1-AUDIT-${Math.floor(Math.random() * 100000)}`,
            title: `Audit Remediation: ${issue}`,
            module: "M1",
            status: "NOT_STARTED" as any,
            priority: "HIGH" as any,
          });
        }
      }

      clientOperations.push(db.client.create({
        data: {
          name,
          slug,
          organizationId: org.id,
          businessName: getValue(fieldMap.businessname),
          phone: getValue(fieldMap.phone),
          email: getValue(fieldMap.email),
          website: getValue(fieldMap.website),
          address: getValue(fieldMap.address),
          city: getValue(fieldMap.city),
          state: getValue(fieldMap.state),
          postalCode: getValue(fieldMap.postalcode),
          type: getValue(fieldMap.type) as any,
          notes: getValue(fieldMap.notes),
          tasks: tasksToCreate.length > 0 ? { create: tasksToCreate } : undefined
        }
      }));
    }

    if (clientOperations.length === 0) {
      return NextResponse.json({ imported: 0, errors });
    }

    await db.$transaction(clientOperations);

    return NextResponse.json({ imported: clientOperations.length, errors });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: "Failed to import clients" }, { status: 500 });
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (inQuotes) {
      if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}