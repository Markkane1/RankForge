import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailTrimmed = email.toLowerCase().trim();

    // Check if client portal user exists and is active
    const portalUser = await db.clientPortalUser.findUnique({
      where: { email: emailTrimmed },
    });

    if (!portalUser || !portalUser.isActive) {
      return NextResponse.json(
        { error: "Access denied: Email is not registered as an active client portal user." },
        { status: 403 }
      );
    }

    // Generate token valid for 15 mins
    const payload = JSON.stringify({
      email: emailTrimmed,
      clientId: portalUser.clientId,
      userId: portalUser.id,
      exp: Date.now() + 15 * 60 * 1000,
    });

    const token = await encryptSecret(payload);

    // Save VerificationToken
    await db.verificationToken.create({
      data: {
        identifier: emailTrimmed,
        token: token,
        expires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // Construct callback magic link URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const magicLink = `${baseUrl}/api/auth/magic-link/callback?token=${encodeURIComponent(token)}`;

    // Print magic link to terminal/logs for seamless development testing
    console.log(`[MAGIC LINK EMAIL SPREAD] To: ${emailTrimmed} | Link: ${magicLink}`);

    return NextResponse.json({
      success: true,
      message: "Magic link sent successfully. Please check your inbox (simulated in logs).",
      link: magicLink, // return link so we can easily test or use it in tests
    });
  } catch (error) {
    console.error("Magic link request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
