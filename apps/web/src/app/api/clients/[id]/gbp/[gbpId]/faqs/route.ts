import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";
import { z } from "zod";

const createFaqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; gbpId: string } }
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const faqs = await db.gbpFaq.findMany({
      where: { gbpProfileId: params.gbpId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(faqs);
  } catch (error) {
    console.error("GET GBP FAQs error:", error);
    return NextResponse.json({ error: "Failed to load FAQs" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; gbpId: string } }
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = createFaqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });
    }

    const faq = await db.gbpFaq.create({
      data: {
        gbpProfileId: params.gbpId,
        question: parsed.data.question,
        answer: parsed.data.answer,
      },
    });

    return NextResponse.json(faq, { status: 201 });
  } catch (error) {
    console.error("POST GBP FAQ error:", error);
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
  }
}
