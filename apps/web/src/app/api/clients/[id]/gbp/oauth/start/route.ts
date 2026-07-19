import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const clientId = params.id;
    
    // Check if client exists
    const client = await db.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return new NextResponse('Client not found', { status: 404 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/clients/${clientId}/gbp/oauth/callback`
    );

    const scopes = [
      'https://www.googleapis.com/auth/business.manage'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: clientId, // Passing clientId as state to ensure we link to the right client
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('GBP OAuth Start Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
