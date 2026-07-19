import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requireSession } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  // Expect clientId in query params to associate this auth with a specific RankForge client
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google-business/callback`
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Ensures we get a refresh token
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/business.manage'],
    state: Buffer.from(JSON.stringify({ clientId, userId: auth.session.user.id })).toString('base64'),
  });

  return NextResponse.redirect(url);
}
