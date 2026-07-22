import { describe, expect, it } from "vitest";
import { dossierFindingTaskId, parseDossierFile } from "../../src/lib/dossier-import";

describe("dossier import parser (REQ-M1-01)", () => {
  it("parses CSV audit findings into one normalized finding per task", () => {
    const rows = parseDossierFile(
      "clients.csv",
      'name,email,audit_findings\n"Acme Plumbing",ops@example.com,"Missing H1; Broken service URL"',
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Acme Plumbing");
    expect(rows[0].auditFindings.map((finding) => finding.title)).toEqual([
      "Missing H1",
      "Broken service URL",
    ]);
  });

  it("parses JSON dossier findings and creates stable audit task IDs", () => {
    const rows = parseDossierFile(
      "clients.json",
      JSON.stringify({
        clients: [
          {
            name: "Acme Plumbing",
            auditFindings: [
              {
                title: "Missing primary category",
                severity: "high",
                url: "https://example.com",
              },
            ],
          },
        ],
      }),
    );

    const taskId = dossierFindingTaskId(rows[0].name, rows[0].auditFindings[0], 1);

    expect(rows[0].auditFindings[0]).toMatchObject({
      title: "Missing primary category",
      severity: "HIGH",
      url: "https://example.com",
    });
    expect(taskId).toBe(dossierFindingTaskId(rows[0].name, rows[0].auditFindings[0], 1));
    expect(taskId).toMatch(/^M1-AUDIT-[a-f0-9]{12}$/);
  });
});
