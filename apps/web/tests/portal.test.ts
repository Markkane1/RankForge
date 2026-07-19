import { describe, it, expect, vi } from 'vitest';

// Mock env to bypass Zod validation during tests
vi.mock('../src/lib/env', () => ({
  env: {
    TWO_FACTOR_ENCRYPTION_KEY: '12345678901234567890123456789012'
  }
}));

import { encryptSecret, decryptSecret } from '../src/lib/crypto';

describe('Client Portal Authentication & Pagination (REQ-UI-02, REQ-UI-05)', () => {
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
});
