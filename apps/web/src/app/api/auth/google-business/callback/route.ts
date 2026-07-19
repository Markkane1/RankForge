import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { encryptSecret } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateBase64 = searchParams.get('state');

  if (!code || !stateBase64) {
    return NextResponse.json({ error: 'Missing code or state from Google' }, { status: 400 });
  }

  try {
    const state = JSON.parse(Buffer.from(stateBase64, 'base64').toString('utf8'));
    const { clientId } = state;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
      process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google-business/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    const encryptedAccessToken = await encryptSecret(tokens.access_token!);
    const encryptedRefreshToken = tokens.refresh_token ? await encryptSecret(tokens.refresh_token) : null;
    
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Persist to database ClientCredential table
    const existing = await db.clientCredential.findFirst({
      where: { clientId, service: 'GBP' }
    });

    if (existing) {
      await db.clientCredential.update({
        where: { id: existing.id },
        data: {
          encryptedToken: encryptedAccessToken,
          ...(encryptedRefreshToken && { refreshToken: encryptedRefreshToken }),
          tokenExpiryAt: expiryDate,
          isValid: true,
          updatedAt: new Date()
        }
      });
    } else {
      await db.clientCredential.create({
        data: {
          clientId,
          service: 'GBP',
          encryptedToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiryAt: expiryDate,
          isValid: true,
          scope: tokens.scope,
        }
      });
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/clients/${clientId}?success=gbp_connected`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=gbp_oauth_failed`);
  }
}
