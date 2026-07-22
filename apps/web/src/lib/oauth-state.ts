import crypto from 'crypto';
import { env } from '@/lib/env';

type OAuthState = {
  clientId: string;
  userId: string;
  iat: number;
};

export function signOAuthState(clientId: string, userId: string) {
  const payload = Buffer.from(JSON.stringify({
    clientId,
    userId,
    iat: Date.now(),
  } satisfies OAuthState)).toString('base64url');
  const sig = crypto.createHmac('sha256', env.NEXTAUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state: string, maxAgeMs = 10 * 60 * 1000): OAuthState {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) throw new Error('Invalid OAuth state');

  const expected = crypto.createHmac('sha256', env.NEXTAUTH_SECRET).update(payload).digest('base64url');
  const signatureBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid OAuth state signature');
  }

  let parsed: OAuthState;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;
  } catch {
    throw new Error('Invalid OAuth state');
  }
  if (!parsed.clientId || !parsed.userId || Date.now() - parsed.iat > maxAgeMs) {
    throw new Error('Expired OAuth state');
  }

  return parsed;
}
