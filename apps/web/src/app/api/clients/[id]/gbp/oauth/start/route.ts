import { NextResponse } from "next/server";
import { google } from "googleapis";
import { withClientTenant } from "@/lib/db";
import { requireClientRole } from "@/lib/auth-guard";
import { signOAuthState } from "@/lib/oauth-state";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const clientId = params.id;
    const auth = await requireClientRole(clientId, "OWNER", "COORDINATOR");
    if (!auth.ok) return auth.response;

    // Check if client exists
    const client = await withClientTenant(clientId, (tenantDb) =>
      tenantDb.client.findUnique({
        where: { id: clientId },
      }),
    );

    if (!client) {
      return new NextResponse("Client not found", { status: 404 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/clients/${clientId}/gbp/oauth/callback`,
    );

    const scopes = ["https://www.googleapis.com/auth/business.manage"];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      state: signOAuthState(clientId, auth.user.id),
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("GBP OAuth Start Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
