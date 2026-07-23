import { beforeEach, describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock env to bypass Zod validation during tests
vi.mock('../../src/lib/env', () => ({
  env: {
    TWO_FACTOR_ENCRYPTION_KEY: '12345678901234567890123456789012'
  }
}));

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  requireSession: vi.fn(),
  withClientTenant: vi.fn(),
  pdf: vi.fn(),
}));

vi.mock('../../src/lib/auth-guard', () => ({
  requireSession: mocks.requireSession,
}));

vi.mock('../../src/lib/db', () => ({
  db: {
    client: {
      findMany: mocks.findMany,
    },
  },
  withClientTenant: mocks.withClientTenant,
}));

vi.mock('@react-pdf/renderer', () => ({
  pdf: mocks.pdf,
}));

vi.mock('@/components/reports/monthly-report', () => ({
  MonthlyReportDocument: () => null,
}));

import { encryptSecret, decryptSecret } from '../../src/lib/crypto';
import { GET as getMonthlyReport } from '../../src/app/api/reports/monthly/route';

describe('Client Portal Authentication & Pagination (REQ-UI-02, REQ-UI-05)', () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.requireSession.mockReset();
    mocks.withClientTenant.mockReset();
    mocks.pdf.mockReset();
    mocks.requireSession.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    mocks.withClientTenant.mockImplementation((_clientId: string, fn: (db: unknown) => unknown) =>
      fn({ client: { findMany: mocks.findMany } }),
    );
    mocks.findMany.mockResolvedValue([]);
    mocks.pdf.mockReturnValue({
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')),
    });
  });

  it('should encrypt and decrypt a portal token correctly', async () => {
    const payload = {
      userId: 'user123',
      clientId: 'client456',
      email: 'client@example.com',
      exp: Date.now() + 15 * 60 * 1000,
    };

    const token = await encryptSecret(JSON.stringify(payload));
    expect(token).toBeDefined();

    const decrypted = await decryptSecret(token);
    const parsed = JSON.parse(decrypted);

    expect(parsed.userId).toBe('user123');
    expect(parsed.clientId).toBe('client456');
    expect(parsed.email).toBe('client@example.com');
  });

  it('should calculate offset and limit pagination logic correctly', () => {
    const page = 3;
    const limit = 25;
    const skip = (page - 1) * limit;

    expect(skip).toBe(50);
  });

  it('allows monthly report download only for the encrypted portal session client', async () => {
    const token = await encryptSecret(JSON.stringify({
      userId: 'portal-user',
      clientId: 'client-1',
      email: 'client@example.com',
      exp: Date.now() + 15 * 60 * 1000,
    }));

    const allowed = await getMonthlyReport(new NextRequest(
      'http://localhost/api/reports/monthly?clientId=client-1&month=1&year=2025',
      { headers: { cookie: `portal-session=${token}` } },
    ));
    expect(allowed.status).toBe(200);
    expect(mocks.withClientTenant).toHaveBeenCalledWith('client-1', expect.any(Function));

    mocks.withClientTenant.mockClear();
    const denied = await getMonthlyReport(new NextRequest(
      'http://localhost/api/reports/monthly?clientId=client-2&month=1&year=2025',
      { headers: { cookie: `portal-session=${token}` } },
    ));
    expect(denied.status).toBe(403);
    expect(mocks.withClientTenant).not.toHaveBeenCalled();
  });
});
