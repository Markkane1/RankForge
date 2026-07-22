import crypto from "node:crypto";
import { z } from "zod";

const optionalText = z
  .union([z.string(), z.number(), z.boolean()])
  .optional()
  .transform((value) => (value === undefined ? undefined : String(value).trim() || undefined));

const rawAuditFindingSchema = z.union([
  z.string(),
  z.object({
    title: optionalText,
    issue: optionalText,
    finding: optionalText,
    description: optionalText,
    severity: optionalText,
    url: optionalText,
  }),
]);

const dossierRowSchema = z
  .object({
    name: z.string().trim().min(1),
    businessName: optionalText,
    phone: optionalText,
    email: optionalText,
    website: optionalText,
    address: optionalText,
    city: optionalText,
    state: optionalText,
    postalCode: optionalText,
    type: optionalText,
    notes: optionalText,
    auditFindings: z.array(rawAuditFindingSchema).default([]),
  })
  .passthrough();

export type DossierAuditFinding = {
  title: string;
  description?: string;
  severity?: string;
  url?: string;
};

export type DossierClientRow = z.infer<typeof dossierRowSchema> & {
  auditFindings: DossierAuditFinding[];
};

export function parseDossierFile(fileName: string, text: string): DossierClientRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (fileName.toLowerCase().endsWith(".json")) {
    return normalizeJsonDossier(trimmed);
  }

  if (fileName.toLowerCase().endsWith(".csv")) {
    return normalizeCsvDossier(trimmed);
  }

  throw new Error("Only CSV and JSON dossier files are accepted");
}

export function dossierFindingTaskId(clientName: string, finding: DossierAuditFinding, index: number): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${clientName}|${index}|${finding.title}|${finding.description ?? ""}|${finding.url ?? ""}`)
    .digest("hex")
    .slice(0, 12);
  return `M1-AUDIT-${hash}`;
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (inQuotes && ch === '"' && next === '"') {
      current += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

function normalizeJsonDossier(text: string): DossierClientRow[] {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed) ? parsed : parsed.clients;
  if (!Array.isArray(rows)) {
    throw new Error("JSON dossier must be an array or an object with a clients array");
  }

  return rows.map((row) => normalizeDossierRow(row));
}

function normalizeCsvDossier(text: string): DossierClientRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row");
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  if (!headers.includes("name")) {
    throw new Error("CSV must have a name column");
  }

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) row[header] = cols[index]?.trim();
    });

    row.auditFindings = parseAuditFindings(
      row.auditFindings ?? row.auditIssues ?? row.auditFinding ?? row.auditIssue,
    );
    return normalizeDossierRow(row);
  });
}

function normalizeDossierRow(row: unknown): DossierClientRow {
  const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const aliased = {
    ...record,
    businessName: record.businessName ?? record.businessname ?? record.business_name,
    postalCode: record.postalCode ?? record.postalcode ?? record.postal_code,
    auditFindings: parseAuditFindings(
      record.auditFindings ?? record.audit_findings ?? record.auditIssues ?? record.audit_issues,
    ),
  };

  const parsed = dossierRowSchema.parse(aliased);
  return {
    ...parsed,
    auditFindings: parsed.auditFindings.map(normalizeAuditFinding),
  };
}

function parseAuditFindings(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  if (typeof value !== "string" || !value.trim()) return [];

  const trimmed = value.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    return parsed.findings ?? parsed.auditFindings ?? [parsed];
  }

  return trimmed.split(";").map((item) => item.trim()).filter(Boolean);
}

function normalizeAuditFinding(finding: z.infer<typeof rawAuditFindingSchema>): DossierAuditFinding {
  if (typeof finding === "string") {
    return { title: finding };
  }

  return {
    title: finding.title ?? finding.issue ?? finding.finding ?? "Untitled audit finding",
    description: finding.description,
    severity: finding.severity?.toUpperCase(),
    url: finding.url,
  };
}

function normalizeHeader(header: string): string {
  const compact = header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    auditissues: "auditFindings",
    auditissue: "auditFindings",
    auditfindings: "auditFindings",
    auditfinding: "auditFindings",
    businessname: "businessName",
    postalcode: "postalCode",
  };
  return aliases[compact] ?? compact;
}
