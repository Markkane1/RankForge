import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { authenticator } from 'otplib';
import { redisConnection } from '@rankforge/queue';
import { encryptSecret } from '@/lib/crypto';
import { db } from '@/lib/db';
import { requireSession, requireOwner } from '@/lib/auth-guard';
import { rateLimit2fa, rateLimitSensitive } from '@/lib/rate-limit';
import { getSignInIp } from '@/lib/crypto';

const PENDING_SECRET_TTL = 5 * 60; // 5 minutes to confirm

export async function POST(request: NextRequest) {
  try {
    // ─── Auth check ───
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const userId = auth.user.id;

    // ─── Rate limit ───
    const ip = getSignInIp(request);
    const rl = await rateLimitSensitive(ip, '2fa-setup');
    if (!rl.success) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfter) },
        },
      );
    }
    const rl2fa = await rateLimit2fa(userId);
    if (!rl2fa.success) {
      return NextResponse.json(
        { error: `Too many 2FA attempts. Try again in ${rl2fa.retryAfter} seconds.` },
        { status: 429 },
      );
    }

    // ─── Generate TOTP secret ───
    const secret = authenticator.generateSecret();
    const encryptedSecret = await encryptSecret(secret);

    // Store pending secret in Redis (not yet persisted to DB)
    const redisKey = `2fa:pending:${userId}`;
    await redisConnection.set(redisKey, encryptedSecret, 'EX', PENDING_SECRET_TTL);

    // Generate otpauth:// URI for authenticator apps
    const appName = 'RankForge';
    const otpauthUri = authenticator.keyuri(auth.user.email, appName, secret);

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return NextResponse.json({
      qrCode: qrDataUrl,
      otpauthUri,
      secret, // Show to user for manual entry (only during setup)
      expiresIn: PENDING_SECRET_TTL,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json({ error: 'Failed to generate 2FA secret' }, { status: 500 });
  }
}
