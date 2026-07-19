import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Verification token is missing" }, { status: 400 });
    }

    // Try finding VerificationToken
    const stored = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!stored || stored.expires.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Magic link has expired or is invalid." }, { status: 400 });
    }

    // Delete token to prevent reuse
    await db.verificationToken.delete({
      where: { token },
    });

    // Decrypt the token payload
    const decrypted = await decryptSecret(token);
    const payload = JSON.parse(decrypted);

    // Verify expiration inside payload
    if (payload.exp <= Date.now()) {
      return NextResponse.json({ error: "Magic link has expired." }, { status: 400 });
    }

    // Set lastLoginAt
    await db.clientPortalUser.update({
      where: { id: payload.userId },
      data: { lastLoginAt: new Date() },
    });

    // Create session cookie token
    const sessionPayload = JSON.stringify({
      userId: payload.userId,
      clientId: payload.clientId,
      email: payload.email,
      exp: Date.now() + 12 * 60 * 60 * 1000, // 12 hours portal session
    });

    const sessionCookie = await encryptSecret(sessionPayload);

    // Redirect to client portal
    const response = NextResponse.redirect(new URL("/portal", request.url));
    
    // Set secure HttpOnly cookie
    response.cookies.set("portal-session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 12 * 60 * 60, // 12 hours
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Magic link verification callback error:", error);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
