import { NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import { decryptSecret } from '@/lib/crypto';
import { db } from '@/lib/db';
import { requireOwner } from '@/lib/auth-guard';
import { rateLimit2fa, rateLimitSensitive } from '@/lib/rate-limit';
import { getSignInIp } from '@/lib/crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // ─── Auth check: OWNER only ───
    const auth = await requireOwner();
    if (!auth.ok) return auth.response;

    const userId = auth.user.id;

    // ─── Rate limit ───
    const ip = getSignInIp(request);
    const rl = await rateLimitSensitive(ip, '2fa-disable');
    if (!rl.success) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
        { status: 429 },
      );
    }
    const rl2fa = await rateLimit2fa(userId);
    if (!rl2fa.success) {
      return NextResponse.json(
        { error: `Too many 2FA attempts. Try again in ${rl2fa.retryAfter} seconds.` },
        { status: 429 },
      );
    }

    // ─── Parse body ───
    const body = await request.json();
    const { password, totpCode } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    if (!totpCode || typeof totpCode !== 'string') {
      return NextResponse.json({ error: 'Current 2FA code is required' }, { status: 400 });
    }

    // ─── Fetch user with credentials ───
    const user = await db.staffUser.findUnique({
      where: { id: userId },
      select: {
        passwordHash: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    }

    // ─── Verify password ───
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // ─── Verify TOTP code ───
    if (!user.twoFactorSecret) {
      return NextResponse.json({ error: '2FA secret not found' }, { status: 400 });
    }

    let totpValid = false;
    try {
      const secret = await decryptSecret(user.twoFactorSecret);
      totpValid = authenticator.verify({
        token: totpCode,
        secret,
      });
    } catch {
      totpValid = false;
    }

    if (!totpValid) {
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
    }

    // ─── Disable 2FA: clear all 2FA fields ───
    await db.staffUser.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupHash: null,
      },
    });

    return NextResponse.json({
      enabled: false,
      message: '2FA has been disabled.',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 });
  }
}
