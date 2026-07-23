import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { createKeywordSchema, updateKeywordSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clientId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const parsed = createKeywordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { keyword, targetRank, priority } = parsed.data;

    const client = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.client.findUnique({ where: { id: clientId } }),
    );
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const { DataForSeoClient } = await import("@/lib/integrations/dataforseo");
    const dataForSeo = new DataForSeoClient(client.organizationId);
    await dataForSeo.init();
    if (!dataForSeo.isConnected) {
      return NextResponse.json(
        { error: "DataForSEO is required for live keyword research" },
        { status: 424 },
      );
    }
    const keywordResearch = await dataForSeo.getSearchVolume(keyword);

    const newKeyword = await withClientTenant(clientId, async (tenantDb) => {
      const newKeyword = await tenantDb.keywordMapEntry.create({
        data: {
          clientId,
          keyword,
          targetRank,
          searchVolume: keywordResearch.volume,
          priority: priority ?? 5,
          status: "ACTIVE",
          sourceLineage: JSON.stringify(keywordResearch.sourceLineage),
        },
      });

      await tenantDb.changeLogEntry.create({
        data: {
          clientId,
          module: "M3",
          entityType: "KeywordMapEntry",
          entityId: newKeyword.id,
          field: "creation",
          oldValue: null,
          newValue: keyword,
          changedById: auth.user.id,
        },
      });

      return newKeyword;
    });

    return NextResponse.json(newKeyword, { status: 201 });
  } catch (error) {
    console.error("Keyword creation API error:", error);
    return NextResponse.json(
      { error: "Failed to create keyword" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clientId } = await params;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const parsed = updateKeywordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { keywordId, targetRank, priority, status } = parsed.data;

    const existing = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.keywordMapEntry.findUnique({
        where: { id: keywordId },
      }),
    );

    if (!existing || existing.clientId !== clientId) {
      return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
    }

    const updated = await withClientTenant(clientId, async (tenantDb) => {
      const updated = await tenantDb.keywordMapEntry.update({
        where: { id: keywordId },
        data: {
          ...(targetRank !== undefined && { targetRank }),
          ...(priority !== undefined && { priority }),
          ...(status !== undefined && { status }),
        },
      });

      await tenantDb.changeLogEntry.create({
        data: {
          clientId,
          module: "M3",
          entityType: "KeywordMapEntry",
          entityId: keywordId,
          field: "update",
          oldValue: "PREVIOUS_STATE",
          newValue: "UPDATED",
          changedById: auth.user.id,
        },
      });

      return updated;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Keyword update API error:", error);
    return NextResponse.json(
      { error: "Failed to update keyword" },
      { status: 500 },
    );
  }
}
