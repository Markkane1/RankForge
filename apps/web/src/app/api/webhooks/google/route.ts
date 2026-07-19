import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@rankforge/queue';
import { env } from '@/lib/env';
import { verifyGoogleWebhookSignature, getSignInIp } from '@/lib/crypto';
import { rateLimitWebhook } from '@/lib/rate-limit';

/**
 * Google Webhook endpoint.
 *
 * GET  — Verification handshake (Google sends hub.mode=subscribe, hub.challenge)
 * POST — Inbound webhook payload, verified via HMAC-SHA256 signature.
 *
 * This route is intentionally PUBLIC (no requireSession) — it's called by
 * Google's servers, not by browser users. Security is enforced via:
 *   1. HMAC-SHA256 signature verification (x-goog-signature header)
 *   2. IP-based rate limiting (100 req/min per IP)
 *   3. Verification token check on the handshake
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');

  // Google's verification handshake
  if (mode === 'subscribe' && challenge) {
    if (verifyToken !== env.GOOGLE_WEBHOOK_VERIFY_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid verify token' },
        { status: 403 },
      );
    }
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json(
    { error: 'Invalid request. Expected hub.mode=subscribe.' },
    { status: 400 },
  );
}

export async function POST(request: NextRequest) {
  // ─── Rate limit by source IP ───
  const ip = getSignInIp(request);
  const rl = await rateLimitWebhook(ip, 'google');
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limited' },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfter) },
      },
    );
  }

  // ─── Read raw body for signature verification ───
  const rawBody = await request.text();
  const signature = request.headers.get('x-goog-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing x-goog-signature header' },
      { status: 401 },
    );
  }

  // ─── Verify HMAC-SHA256 signature (constant-time compare) ───
  const valid = verifyGoogleWebhookSignature(
    rawBody,
    signature,
    env.GOOGLE_WEBHOOK_SECRET,
  );

  if (!valid) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 403 },
    );
  }

  // ─── Parse and enqueue for async processing ───
  try {
    const payload = JSON.parse(rawBody);

    // Enqueue to the existing BullMQ worker for async handling
    // The worker can be extended to handle Google webhook event types
    await taskQueue.add('GoogleWebhookEvent', {
      provider: 'google',
      payload,
      receivedAt: new Date().toISOString(),
    }, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    // Acknowledge receipt immediately — don't make Google wait
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Google webhook processing error:', error);
    // Return 500 so Google retries delivery
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
