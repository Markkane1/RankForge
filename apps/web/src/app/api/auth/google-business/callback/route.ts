import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { requireSession } from "@/lib/auth-guard";
import { verifyOAuthState } from "@/lib/oauth-state";
import { GBP_OAUTH_SERVICE } from "@rankforge/database";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google Business OAuth is not configured" },
      { status: 503 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateBase64 = searchParams.get("state");

  if (!code || !stateBase64) {
    return NextResponse.json(
      { error: "Missing code or state from Google" },
      { status: 400 },
    );
  }

  try {
    let state;
    try {
      state = verifyOAuthState(stateBase64);
    } catch {
      return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
    }
    if (state.userId !== auth.user.id) {
      return NextResponse.json({ error: "State mismatch" }, { status: 400 });
    }
    const { clientId } = state;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google-business/callback`,
    );

    const { tokens } = await oauth2Client.getToken(code);

    const encryptedAccessToken = await encryptSecret(tokens.access_token!);
    const encryptedRefreshToken = tokens.refresh_token
      ? await encryptSecret(tokens.refresh_token)
      : null;

    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    await db.clientCredential.updateMany({
      where: {
        clientId,
        service: GBP_OAUTH_SERVICE,
      },
      data: { isValid: false },
    });

    await db.clientCredential.create({
      data: {
        clientId,
        service: GBP_OAUTH_SERVICE,
        encryptedToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiryAt: expiryDate,
        isValid: true,
        scope: tokens.scope,
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/clients/${clientId}?success=gbp_connected`,
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?error=gbp_oauth_failed`,
    );
  }
}
