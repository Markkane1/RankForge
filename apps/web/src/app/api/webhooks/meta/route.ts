import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimitWebhook } from '@/lib/rate-limit';
import { taskQueue } from '@rankforge/queue';

function getMetaWebhookSecret() {
  const secret = process.env.META_WEBHOOK_SECRET;
  if (!secret) throw new Error('META_WEBHOOK_SECRET is required');
  return secret;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Rate limit
    const rl = await rateLimitWebhook(ip, 'meta');
    if (!rl.success) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Must get raw text for signature verification
    const rawBody = await request.text();

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', getMetaWebhookSecret())
      .update(rawBody)
      .digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process webhook
    let data;
    try {
      data = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    console.log('Received valid Meta webhook:', data);
    
    // Process WhatsApp inbound messages
    if (data.object === 'whatsapp_business_account' && data.entry) {
      for (const entry of data.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.value && change.value.messages) {
              await taskQueue.add('MetaWebhookEvent', {
                messages: change.value.messages,
                metadata: change.value.metadata,
                contacts: change.value.contacts,
                timestamp: new Date().toISOString()
              }, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 }
              });
            }
          }
        }
      }
    }
    
    // Return 200 OK immediately to acknowledge receipt
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meta webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Meta webhook verification challenge
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === getMetaWebhookSecret()) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
}
