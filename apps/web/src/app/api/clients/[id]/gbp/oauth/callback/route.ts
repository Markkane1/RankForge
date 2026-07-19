import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { encryptSecret } from '@/lib/crypto';
import { auth } from '@/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return new NextResponse('No code provided', { status: 400 });
    }

    const clientId = params.id;
    if (clientId !== state) {
      return new NextResponse('State mismatch', { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/clients/${clientId}/gbp/oauth/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token returned from Google');
    }

    // Encrypt the tokens using KMS envelope encryption
    const encryptedAccessToken = await encryptSecret(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token 
      ? await encryptSecret(tokens.refresh_token)
      : null;

    // Upsert the client credential in the database
    const existing = await db.clientCredential.findFirst({
      where: { clientId, service: 'GBP' },
    });

    if (existing) {
      await db.clientCredential.update({
        where: { id: existing.id },
        data: {
          encryptedToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken || existing.refreshToken,
          tokenExpiryAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: tokens.scope,
          isValid: true,
        },
      });
    } else {
      await db.clientCredential.create({
        data: {
          clientId,
          service: 'GBP',
          encryptedToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiryAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: tokens.scope,
          isValid: true,
        },
      });
    }

    // Redirect the user back to the client's setting portal
    return NextResponse.redirect(new URL(`/dashboard/clients/${clientId}/settings`, request.url));
  } catch (error) {
    console.error('GBP OAuth Callback Error:', error);
    return new NextResponse('Failed to exchange token', { status: 500 });
  }
}
