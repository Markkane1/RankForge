import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClientRole } from "@/lib/auth-guard";
import { withClientTenant } from "@/lib/db";

const submitCitationSchema = z.object({
  credentialsRef: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; citationId: string }> },
) {
  const { id: clientId, citationId } = await params;
  const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
  if (!auth.ok) return auth.response;

  const parsed = submitCitationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid citation submission", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const updated = await withClientTenant(clientId, async (tenantDb) => {
    const citation = await tenantDb.citationRecord.findUnique({
      where: { id: citationId },
    });
    if (!citation || citation.clientId !== clientId) return null;
    return tenantDb.citationRecord.update({
      where: { id: citationId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        credentialsRef: parsed.data.credentialsRef,
      },
    });
  });

  if (!updated)
    return NextResponse.json({ error: "Citation not found" }, { status: 404 });
  return NextResponse.json(updated);
}
