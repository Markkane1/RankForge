import NextAuth, { CredentialsSignin } from 'next-auth';
import { authConfig } from './auth.config';
import CredentialsProvider from 'next-auth/providers/credentials';
import Nodemailer from 'next-auth/providers/nodemailer';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { decryptSecret } from '@/lib/crypto';
import { env } from '@/lib/env';
import { getLockout, recordFailure, clearFailures } from '@/lib/rate-limit';
import { getSignInIp } from '@/lib/crypto';

class CustomAuthError extends CredentialsSignin {
  constructor(message: string) {
    super();
    this.message = message;
    this.code = message;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  // REQ-AUTH-01: Staff owner login runs through Auth.js credentials/email providers.
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours idle timeout natively
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  // ─── Security: require NEXTAUTH_SECRET in all environments ───
  secret: env.NEXTAUTH_SECRET,
  providers: [
    ...(process.env.EMAIL_SERVER && process.env.EMAIL_FROM
      ? [
          Nodemailer({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM,
          }),
        ]
      : []),
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        // Optional: TOTP code sent during 2FA step
        totp: { label: '2FA Code', type: 'text' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;
        const totpCode = credentials.totp as string | undefined;

        // ─── Lockout check ───
        // request is the NextAuth internal request — extract IP from headers
        const ip = request
          ? getSignInIp(request as unknown as Request)
          : 'unknown';
        const rlKey = `${ip}:${email}`;

        // Check lockout first
        const lockTtl = await getLockout(rlKey);
        if (lockTtl !== null) {
          throw new CustomAuthError(
            `Account temporarily locked. Try again in ${lockTtl} seconds.`
          );
        }

        // ─── User lookup ───
        const user = await db.staffUser.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            organizationId: true,
            passwordHash: true,
            isActive: true,
            twoFactorEnabled: true,
            twoFactorSecret: true,
            twoFactorBackupHash: true,
          },
        });

        if (!user || !user.passwordHash) {
          await recordFailure(rlKey, 5, 15 * 60);
          return null;
        }

        // ─── Active check ───
        if (!user.isActive) {
          throw new CustomAuthError('Account is deactivated. Contact your administrator.');
        }

        // ─── Password verification ───
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await recordFailure(rlKey, 5, 15 * 60);
          return null;
        }

        // ─── 2FA verification ───
        if (user.twoFactorEnabled) {
          if (!totpCode) {
            // Signal to the client that 2FA is required.
            throw new CustomAuthError('2FA_REQUIRED');
          }

          // Try TOTP verification first
          let totpValid = false;
          if (user.twoFactorSecret) {
            try {
              const secret = await decryptSecret(user.twoFactorSecret);
              totpValid = authenticator.verify({
                token: totpCode,
                secret,
              });
            } catch {
              // Decryption failure — don't leak details
              totpValid = false;
            }
          }

          // Try backup codes if TOTP failed
          if (!totpValid && user.twoFactorBackupHash) {
            const backupCodes = user.twoFactorBackupHash.split('\n').filter(Boolean);
            for (let i = 0; i < backupCodes.length; i++) {
              const match = await bcrypt.compare(totpCode, backupCodes[i]);
              if (match) {
                // Burn this backup code — remove it from the hash list
                const remaining = backupCodes.filter((_, idx) => idx !== i);
                await db.staffUser.update({
                  where: { id: user.id },
                  data: {
                    twoFactorBackupHash: remaining.length > 0 ? remaining.join('\n') : null,
                  },
                });
                totpValid = true;
                break;
              }
            }
          }

          if (!totpValid) {
            await recordFailure(rlKey, 5, 15 * 60);
            throw new CustomAuthError('Invalid 2FA code. Please try again.');
          }
        }

        // ─── Clear failures on successful auth ───
        await clearFailures(rlKey);

        // ─── Update lastLoginAt ───
        await db.staffUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        const requires2FA = user.role === 'OWNER' && !user.twoFactorEnabled;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorVerified: requires2FA ? false : true,
        };
      },
    }),
  ],
});
