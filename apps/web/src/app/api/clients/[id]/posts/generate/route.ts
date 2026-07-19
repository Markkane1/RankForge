import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const { keyword, topic } = await request.json();

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    const gbpProfile = await db.gbpProfile.findUnique({
      where: { clientId: id },
    });

    if (!gbpProfile) {
      return NextResponse.json({ error: "No GBP Profile found for this client" }, { status: 404 });
    }

    // Call standard LLM (e.g. OpenAI)
    let generatedContent = "";
    let generatedTitle = "";

    if (process.env.OPENAI_API_KEY) {
      const prompt = `Write an engaging Google Business Profile update post about "${topic || keyword}". Focus on local SEO for the keyword "${keyword}". Keep it under 100 words.`;
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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
        generatedTitle = `${topic || keyword} Update`;
      } else {
        throw new Error("Failed to generate content from AI");
      }
    } else {
      // Fallback stub if no API key
      generatedContent = `Check out our latest services regarding ${keyword}! We provide top-notch quality and ensure customer satisfaction. Contact us today to learn more about our ${topic || 'offerings'}.`;
      generatedTitle = `Latest updates on ${keyword}`;
    }

    // Save as DRAFT in Content Calendar
    const post = await db.gbpPost.create({
      data: {
        gbpProfileId: gbpProfile.id,
        title: generatedTitle,
        content: generatedContent,
        status: "DRAFT",
        eventType: "STANDARD",
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("AI Content Gen Error:", error);
    return NextResponse.json(
      { error: "Failed to generate post" },
      { status: 500 }
    );
  }
}
