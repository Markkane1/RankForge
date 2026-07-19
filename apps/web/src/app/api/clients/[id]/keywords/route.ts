import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { createKeywordSchema, updateKeywordSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId } = await params;
    const body = await request.json();

    const parsed = createKeywordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { keyword, targetRank, priority } = parsed.data;

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // REQ-M1-05: Fetch real search volume from DataForSEO
    let searchVolume = null;
    try {
      const { DataForSeoClient } = await import("@/lib/integrations/dataforseo");
      const dataForSeo = new DataForSeoClient(client.organizationId);
      await dataForSeo.init();
      if (dataForSeo.isConnected) {
        const result = await dataForSeo.getSearchVolume(keyword);
        searchVolume = result.volume;
      }
    } catch (e) {
      console.warn("DataForSEO fetch failed, falling back to null volume:", e);
    }

    const newKeyword = await db.keywordMapEntry.create({
      data: {
        clientId,
        keyword,
        targetRank,
        searchVolume,
        priority: priority ?? 5,
        status: "ACTIVE",
      },
    });

    await db.changeLogEntry.create({
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

    return NextResponse.json(newKeyword, { status: 201 });
  } catch (error) {
    console.error("Keyword creation API error:", error);
    return NextResponse.json({ error: "Failed to create keyword" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('OWNER', 'COORDINATOR');
  if (!auth.ok) return auth.response;

  try {
    const { id: clientId } = await params;
    const body = await request.json();

    const parsed = updateKeywordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { keywordId, targetRank, priority, status } = parsed.data;

    const existing = await db.keywordMapEntry.findUnique({
      where: { id: keywordId },
    });

    if (!existing || existing.clientId !== clientId) {
      return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
    }

    const updated = await db.keywordMapEntry.update({
      where: { id: keywordId },
      data: {
        ...(targetRank !== undefined && { targetRank }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
      },
    });

    await db.changeLogEntry.create({
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Keyword update API error:", error);
    return NextResponse.json({ error: "Failed to update keyword" }, { status: 500 });
  }
}
