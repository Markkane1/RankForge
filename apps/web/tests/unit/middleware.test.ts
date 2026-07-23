import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from '../../src/middleware';

vi.mock('next-auth', () => ({
  default: () => ({
    auth: () => Response.json({ ok: true }),
  }),
}));

function request(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

describe('middleware CSRF guard', () => {
  it('rejects cross-origin mutating API requests', () => {
    const response = middleware(
      request('https://rankforge.test/api/tasks', {
        method: 'POST',
        headers: { origin: 'https://evil.test' },
      })
    );

    expect(response.status).toBe(403);
  });

  it('allows same-origin mutating API requests', () => {
    const response = middleware(
      request('https://rankforge.test/api/tasks', {
        method: 'POST',
        headers: { origin: 'https://rankforge.test' },
      })
    );

    expect(response.status).toBe(200);
  });

  it('keeps provider webhooks exempt from browser-origin checks', () => {
    const response = middleware(
      request('https://rankforge.test/api/webhooks/google', {
        method: 'POST',
      })
    );

    expect(response.status).toBe(200);
  });

  it('keeps secret-gated conversion ingestion exempt from browser-origin checks', () => {
    const response = middleware(
      request('https://rankforge.test/api/events/conversion', {
        method: 'POST',
      })
    );

    expect(response.status).toBe(200);
  });

  it('rejects cross-origin browser conversion events', () => {
    const response = middleware(
      request('https://rankforge.test/api/events/conversion/browser', {
        method: 'POST',
        headers: { origin: 'https://evil.test' },
      })
    );

    expect(response.status).toBe(403);
  });

  it('allows same-origin browser conversion events', () => {
    const response = middleware(
      request('https://rankforge.test/api/events/conversion/browser', {
        method: 'POST',
        headers: { origin: 'https://rankforge.test' },
      })
    );

    expect(response.status).toBe(200);
  });
});
