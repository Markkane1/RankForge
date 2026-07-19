import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth-guard";
import { google } from "googleapis";
import { decryptSecret } from "@/lib/crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, gbpId: string }> }
) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const { id, gbpId } = await params;
    
    // Fetch Client and their GBP Profile
    const client = await db.client.findUnique({
      where: { id },
      include: { gbpProfiles: { where: { id: gbpId } } },
    });

    const gbpProfile = client?.gbpProfiles?.[0];

    if (!client || !gbpProfile?.gbpAccountId || !gbpProfile?.gbpLocationId) {
      return NextResponse.json({ error: "Client or GBP Location not found" }, { status: 404 });
    }

    // Get the credential
    const cred = await db.clientCredential.findFirst({
      where: { clientId: id, service: "GBP", isValid: true },
    });

    if (!cred) {
      return NextResponse.json({ error: "Not authorized for GBP. Please run OAuth flow." }, { status: 403 });
    }

    const decryptedToken = await decryptSecret(cred.encryptedToken);
    const decryptedRefresh = cred.refreshToken ? await decryptSecret(cred.refreshToken) : null;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: decryptedToken,
      refresh_token: decryptedRefresh,
    });

    // Google My Business Business Information API uses mybusinessbusinessinformation
    const mybusinessverifications = google.mybusinessverifications({
      version: 'v1',
      auth: oauth2Client
    });

    // Fetch verification options for this location
    const locationName = `locations/${gbpProfile.gbpLocationId}`;
    
    try {
      const response = await mybusinessverifications.locations.fetchVerificationOptions({
        location: locationName,
        requestBody: {
          languageCode: 'en',
        }
      });

      return NextResponse.json(response.data);
    } catch (apiError: any) {
      if (apiError.status === 400 && apiError.message.includes('already verified')) {
         // Update DB
         await db.gbpProfile.update({
           where: { id: gbpProfile.id },
           data: { isVerified: true }
         });
         return NextResponse.json({ verified: true, message: "Location is already verified." });
      }
      throw apiError;
    }

  } catch (error) {
    console.error("GBP Verification Wizard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch verification options" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, gbpId: string }> }
) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const { id, gbpId } = await params;
    const body = await request.json();
    const { method, phoneNumber, verificationId } = body; // method: e.g. "PHONE_CALL", "SMS"

    // Fetch Client and their GBP Profile
    const client = await db.client.findUnique({
      where: { id },
      include: { gbpProfiles: { where: { id: gbpId } } },
    });

    const gbpProfile = client?.gbpProfiles?.[0];

    if (!client || !gbpProfile?.gbpAccountId || !gbpProfile?.gbpLocationId) {
      return NextResponse.json({ error: "Client or GBP Location not found" }, { status: 404 });
    }

    // Get the credential
    const cred = await db.clientCredential.findFirst({
      where: { clientId: id, service: "GBP", isValid: true },
    });

    if (!cred) {
      return NextResponse.json({ error: "Not authorized for GBP. Please run OAuth flow." }, { status: 403 });
    }

    const decryptedToken = await decryptSecret(cred.encryptedToken);
    const decryptedRefresh = cred.refreshToken ? await decryptSecret(cred.refreshToken) : null;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: decryptedToken,
      refresh_token: decryptedRefresh,
    });

    const mybusinessverifications = google.mybusinessverifications({
      version: 'v1',
      auth: oauth2Client
    });

    const locationName = `locations/${gbpProfile.gbpLocationId}`;

    if (!verificationId) {
      // Step 1: Start the verification
      const response = await mybusinessverifications.locations.verify({
        name: locationName,
        requestBody: {
          method,
          phoneNumber,
          languageCode: 'en',
        }
      });
      return NextResponse.json(response.data);
    } else {
      // Step 2: Complete the verification (e.g., submit PIN)
      const { pin } = body;
      const response = await mybusinessverifications.locations.verifications.complete({
        name: `${locationName}/verifications/${verificationId}`,
        requestBody: {
          pin
        }
      });
      
      // Update DB
      await db.gbpProfile.update({
        where: { id: gbpProfile.id },
        data: { isVerified: true }
      });

      return NextResponse.json(response.data);
    }

  } catch (error) {
    console.error("GBP Verification Wizard POST error:", error);
    return NextResponse.json(
      { error: "Failed to trigger verification" },
      { status: 500 }
    );
  }
}
