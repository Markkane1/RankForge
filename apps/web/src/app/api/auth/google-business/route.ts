import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requireSession } from '@/lib/auth-guard';
import { signOAuthState } from '@/lib/oauth-state';

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google Business OAuth is not configured' },
      { status: 503 }
    );
  }

  // Expect clientId in query params to associate this auth with a specific RankForge client
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google-business/callback`
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Ensures we get a refresh token
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/business.manage'],
    state: signOAuthState(clientId, auth.user.id),
  });

  return NextResponse.redirect(url);
}
