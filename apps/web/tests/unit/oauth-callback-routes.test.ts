import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  requireClientRole: vi.fn(),
  encryptSecret: vi.fn(),
  withClientTenant: vi.fn(),
  updateMany: vi.fn(),
  createCredential: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock('../../src/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgres://test',
    DIRECT_URL: 'postgres://test',
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: 'test-oauth-state-secret',
    TWO_FACTOR_ENCRYPTION_KEY: 'test',
    GOOGLE_WEBHOOK_SECRET: 'test',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireSession: mocks.requireSession,
  requireClientRole: mocks.requireClientRole,
}));

vi.mock('../../src/lib/crypto', () => ({
  encryptSecret: mocks.encryptSecret,
}));

vi.mock('../../src/lib/db', () => ({
  db: {
    clientCredential: {
      updateMany: mocks.updateMany,
      create: mocks.createCredential,
    },
  },
  withClientTenant: mocks.withClientTenant,
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(function OAuth2() {
        return { getToken: mocks.getToken };
      }),
    },
  },
}));

import { GET as genericCallback } from '../../src/app/api/auth/google-business/callback/route';
import { GET as clientCallback } from '../../src/app/api/clients/[id]/gbp/oauth/callback/route';
import { signOAuthState } from '../../src/lib/oauth-state';

describe('GBP OAuth callback routes', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    process.env.GOOGLE_CLIENT_ID = 'google-client';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    mocks.requireSession.mockResolvedValue({ ok: true, user: { id: 'user-1' } });
    mocks.requireClientRole.mockResolvedValue({ ok: true, user: { id: 'user-1' } });
    mocks.encryptSecret.mockImplementation((value: string) => Promise.resolve(`enc:${value}`));
    mocks.getToken.mockResolvedValue({
      tokens: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiry_date: 1_800_000_000_000,
        scope: 'business.manage',
      },
    });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.createCredential.mockResolvedValue({ id: 'credential-1' });
    mocks.withClientTenant.mockImplementation((_clientId: string, fn: (db: unknown) => unknown) =>
      fn({
        clientCredential: {
          updateMany: mocks.updateMany,
          create: mocks.createCredential,
        },
      }),
    );
  });

  it('rejects missing code or state on the generic callback route', async () => {
    const response = await genericCallback(new NextRequest('http://localhost/api/auth/google-business/callback?code=abc'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing code or state from Google' });
  });

  it('rejects tampered state before token exchange on the generic callback route', async () => {
    const [, signature] = signOAuthState('client-1', 'user-1').split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({
      clientId: 'client-2',
      userId: 'user-1',
      iat: Date.now(),
    })).toString('base64url');

    const response = await genericCallback(new NextRequest(`http://localhost/api/auth/google-business/callback?code=abc&state=${tamperedPayload}.${signature}`));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid OAuth state' });
    expect(mocks.getToken).not.toHaveBeenCalled();
    expect(mocks.createCredential).not.toHaveBeenCalled();
  });

  it('stores canonical GBP OAuth credentials on a valid generic callback', async () => {
    const state = signOAuthState('client-1', 'user-1');

    const response = await genericCallback(new NextRequest(`http://localhost/api/auth/google-business/callback?code=abc&state=${state}`));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard/clients/client-1?success=gbp_connected');
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { clientId: 'client-1', service: 'GBP_OAUTH' },
      data: { isValid: false },
    });
    expect(mocks.createCredential).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-1',
        service: 'GBP_OAUTH',
        encryptedToken: 'enc:access-token',
        refreshToken: 'enc:refresh-token',
        isValid: true,
        scope: 'business.manage',
      }),
    });
  });

  it('rejects expired or mismatched state on the client-scoped callback route', async () => {
    const expiredPayload = Buffer.from(JSON.stringify({
      clientId: 'client-1',
      userId: 'user-1',
      iat: Date.now() - 11 * 60 * 1000,
    })).toString('base64url');
    const signature = crypto
      .createHmac('sha256', 'test-oauth-state-secret')
      .update(expiredPayload)
      .digest('base64url');

    const expired = await clientCallback(
      new Request(`http://localhost/api/clients/client-1/gbp/oauth/callback?code=abc&state=${expiredPayload}.${signature}`),
      { params: { id: 'client-1' } },
    );
    expect(expired.status).toBe(400);
    expect(await expired.text()).toBe('Invalid state');

    const mismatch = await clientCallback(
      new Request(`http://localhost/api/clients/client-1/gbp/oauth/callback?code=abc&state=${signOAuthState('client-2', 'user-1')}`),
      { params: { id: 'client-1' } },
    );
    expect(mismatch.status).toBe(400);
    expect(await mismatch.text()).toBe('State mismatch');
    expect(mocks.getToken).not.toHaveBeenCalled();
  });
});
