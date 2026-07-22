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
    return NextResponse.json({
      GBP: gbp.isConnected,
      WHATSAPP: whatsapp.isConnected,
      DATAFORSEO: dataForSeo.isConnected,
      LOCAL_FALCON: localFalcon.isConnected,
      BRIGHTLOCAL: Boolean(process.env.BRIGHTLOCAL_API_KEY),
      SENDGRID: Boolean(process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY)
    });
  } catch (error) {
    console.error("Integrations GET error:", error);
    return NextResponse.json(
      { error: "Failed to load integrations" },
      { status: 500 }
    );
  }
}
