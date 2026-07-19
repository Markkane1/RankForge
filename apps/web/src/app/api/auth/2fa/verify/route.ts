import { NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import { redisConnection } from '@rankforge/queue';
import { decryptSecret } from '@/lib/crypto';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-guard';
import { rateLimit2fa } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // ─── Auth check ───
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const userId = auth.user.id;

    // ─── Rate limit ───
    const rl = await rateLimit2fa(userId);
    if (!rl.success) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfter} seconds.` },
        { status: 429 },
      );
    }

    // ─── Parse body ───
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json(
        { error: 'A valid 6-digit code is required' },
        { status: 400 },
      );
    }

    // ─── Retrieve pending secret from Redis ───
    const redisKey = `2fa:pending:${userId}`;
    const encryptedSecret = await redisConnection.getdel(redisKey); // GET + DELETE atomically

    if (!encryptedSecret) {
      return NextResponse.json(
        { error: 'No pending 2FA setup found. Please start the setup process again.' },
        { status: 410 }, // Gone
      );
    }

    // ─── Verify TOTP code against the pending secret ───
    let valid = false;
    try {
      const secret = await decryptSecret(encryptedSecret as string);
      valid = authenticator.verify({
        token: code,
        secret,
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to verify code. Please try setup again.' },
        { status: 400 },
      );
    }

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid code. Please try again.' },
        { status: 400 },
      );
    }

    // ─── Generate 10 single-use backup codes ───
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    // Hash backup codes with bcrypt (each code individually)
    const hashedCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );
    const backupHashString = hashedCodes.join('\n');

    // ─── Persist to DB ───
    await db.staffUser.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret as string,
        twoFactorBackupHash: backupHashString,
      },
    });

    return NextResponse.json({
      enabled: true,
      backupCodes, // Shown exactly once — user must save them
      message: '2FA enabled successfully. Save your backup codes in a secure location.',
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ error: 'Failed to verify 2FA code' }, { status: 500 });
  }
}
