import { describe, expect, it, vi } from 'vitest';
import { signOAuthState, verifyOAuthState } from '../../src/lib/oauth-state';

vi.mock('../../src/lib/env', () => ({
  env: {
    NEXTAUTH_SECRET: 'test-oauth-state-secret',
  },
}));

describe('OAuth state signing', () => {
  it('round-trips a signed state payload', () => {
    const state = signOAuthState('client-1', 'user-1');

    expect(verifyOAuthState(state)).toMatchObject({
      clientId: 'client-1',
      userId: 'user-1',
    });
  });

  it('rejects malformed signatures without throwing a timingSafeEqual length error', () => {
    const [payload] = signOAuthState('client-1', 'user-1').split('.');

    expect(() => verifyOAuthState(`${payload}.short`)).toThrow(
      'Invalid OAuth state signature'
    );
  });

  it('rejects tampered payloads', () => {
    const [, sig] = signOAuthState('client-1', 'user-1').split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ clientId: 'client-2', userId: 'user-1', iat: Date.now() })
    ).toString('base64url');

    expect(() => verifyOAuthState(`${tamperedPayload}.${sig}`)).toThrow(
      'Invalid OAuth state signature'
    );
  });

  it('rejects expired callback state', () => {
    const state = signOAuthState('client-1', 'user-1');

    expect(() => verifyOAuthState(state, -1)).toThrow('Expired OAuth state');
  });
});
