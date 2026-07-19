import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-guard";
import { GbpClient } from "@/lib/integrations/google-business";
import { WhatsAppClient } from "@/lib/integrations/whatsapp";
import { DataForSeoClient } from "@/lib/integrations/dataforseo";
import { LocalFalconClient } from "@/lib/integrations/local-falcon";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const orgId = auth.user.id; // Using user ID as organization mock for now, wait, no, auth.user doesn't have orgId
    
    // In a real app we'd get the user's organizationId
    // We will just fetch the organization ID from the db for this user
    const { db } = await import("@/lib/db");
    const staffUser = await db.staffUser.findUnique({
      where: { id: auth.user.id },
      select: { organizationId: true }
    });

    if (!staffUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const orgIdReal = staffUser.organizationId;

    const gbp = new GbpClient(orgIdReal);
    const whatsapp = new WhatsAppClient(orgIdReal);
    const dataForSeo = new DataForSeoClient(orgIdReal);
    const localFalcon = new LocalFalconClient(orgIdReal);

    await Promise.all([
      gbp.init(),
      whatsapp.init(),
      dataForSeo.init(),
      localFalcon.init(),
    ]);

    // SendGrid and BrightLocal are mocked here as true/false 
    // to match the original UI stubs until we build their clients.
    return NextResponse.json({
      GBP: gbp.isConnected,
      WHATSAPP: whatsapp.isConnected,
      DATAFORSEO: dataForSeo.isConnected,
      LOCAL_FALCON: localFalcon.isConnected,
      BRIGHTLOCAL: true, // Mocked for now
      SENDGRID: true // Mocked for now
    });
  } catch (error) {
    console.error("Integrations GET error:", error);
    return NextResponse.json(
      { error: "Failed to load integrations" },
      { status: 500 }
    );
  }
}
