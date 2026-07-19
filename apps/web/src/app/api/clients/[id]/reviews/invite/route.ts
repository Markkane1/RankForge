import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";
import { WhatsAppClient } from "@/lib/integrations/whatsapp";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const { phoneNumber, customerName } = await request.json();

    if (!phoneNumber || !customerName) {
      return NextResponse.json({ error: "Missing phoneNumber or customerName" }, { status: 400 });
    }

    const client = await db.client.findUnique({
      where: { id: params.id },
      include: {
        gbpProfiles: true,
      }
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const primaryGbp = client.gbpProfiles[0];
    const reviewLink = primaryGbp?.websiteUrl || `https://g.page/r/${primaryGbp?.id || 'default'}/review`;

    // Connect WhatsApp Client
    const whatsapp = new WhatsAppClient(client.organizationId);
    await whatsapp.init();

    if (!whatsapp.isConnected) {
      return NextResponse.json({ error: "WhatsApp integration not configured for this organization" }, { status: 400 });
    }

    const messageText = `Hi ${customerName}, thanks for choosing ${client.name}! We value your feedback. Please consider leaving us a review here: ${reviewLink}`;

    await whatsapp.sendMessage(phoneNumber, messageText);

    // Log the action
    await db.leadLogEntry.create({
      data: {
        clientId: client.id,
        source: "WHATSAPP",
        value: 0,
        contactInfo: phoneNumber,
        notes: `Outbound review invite sent to ${customerName}.`,
      }
    });

    return NextResponse.json({ success: true, message: "Review invite sent via WhatsApp" });

  } catch (error: any) {
    console.error("WhatsApp review invite error:", error);
    return NextResponse.json(
      { error: "Failed to send review invite", details: error.message },
      { status: 500 }
    );
  }
}
