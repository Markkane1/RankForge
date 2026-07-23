import { NextRequest, NextResponse } from "next/server";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";

function containsPhoneNumber(text: string): boolean {
  return /\b(?:\+?\d[\d\s().-]{7,}\d)\b/.test(text);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await requireClientRole(id, "OWNER");
    if (!auth.ok) return auth.response;

    const { keyword, topic, gbpId } = await request.json();

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 },
      );
    }

    if (!gbpId) {
      return NextResponse.json(
        { error: "gbpId is required for multi-location clients" },
        { status: 400 },
      );
    }

    const gbpProfile = await withClientTenant(id, (tenantDb) =>
      tenantDb.gbpProfile.findUnique({
        where: { id: gbpId, clientId: id },
      }),
    );

    if (!gbpProfile) {
      return NextResponse.json(
        { error: "No GBP Profile found for this client" },
        { status: 404 },
      );
    }

    // Call standard LLM (e.g. OpenAI)
    let generatedContent = "";
    let generatedTitle = "";

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Post generation unavailable. Configure OPENAI_API_KEY before creating AI drafts.",
        },
        { status: 424 },
      );
    }

    const prompt = `Write an engaging Google Business Profile update post about "${topic || keyword}". Focus on local SEO for the keyword "${keyword}". Keep it under 100 words.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      generatedContent = data.choices[0].message.content.trim();
      if (containsPhoneNumber(generatedContent)) {
        return NextResponse.json(
          {
            error:
              "Post compliance failed: body must not contain phone numbers.",
          },
          { status: 400 },
        );
      }
      generatedTitle = `${topic || keyword} Update`;
    } else {
      throw new Error("Failed to generate content from AI");
    }

    // Save as DRAFT in Content Calendar
    const post = await withClientTenant(id, (tenantDb) =>
      tenantDb.gbpPost.create({
        data: {
          gbpProfileId: gbpProfile.id,
          title: generatedTitle,
          content: generatedContent,
          status: "DRAFT",
          eventType: "STANDARD",
        },
      }),
    );

    return NextResponse.json(post);
  } catch (error) {
    console.error("AI Content Gen Error:", error);
    return NextResponse.json(
      { error: "Failed to generate post" },
      { status: 500 },
    );
  }
}
