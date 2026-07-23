import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptSecret, decryptSecret } from '../../src/lib/crypto';
import * as kms from '../../src/lib/kms';

// Mock the kms module
vi.mock('../../src/lib/kms', () => ({
  encryptWithKms: vi.fn(),
  decryptWithKms: vi.fn(),
  getKmsKeyName: vi.fn(() => 'projects/project-1/locations/global/keyRings/ring-1/cryptoKeys/key-1'),
}));

// Mock env to bypass Zod validation during tests
vi.mock('../../src/lib/env', () => ({
  env: {
    TWO_FACTOR_ENCRYPTION_KEY: '12345678901234567890123456789012'
  }
}));

describe('KMS Fallback Logic (REQ-02)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  it('should fallback to local AES-256-GCM if GCP credentials are not present', async () => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const plaintext = 'super-secret-totp';

    const ciphertext = await encryptSecret(plaintext);
    
    // It should not be prefixed with kms:
    expect(ciphertext.startsWith('kms:')).toBe(false);
    
    const decrypted = await decryptSecret(ciphertext);
    expect(decrypted).toBe(plaintext);
    
    expect(kms.encryptWithKms).not.toHaveBeenCalled();
  });

  it('should route to KMS if GCP credentials are present', async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.json';
    const plaintext = 'gcp-secret';
    const fakeKmsCipher = 'fake-kms-cipher-base64';
    
    // Mock successful KMS encryption
    vi.mocked(kms.encryptWithKms).mockResolvedValue(fakeKmsCipher);
    vi.mocked(kms.decryptWithKms).mockResolvedValue(plaintext);

    const ciphertext = await encryptSecret(plaintext);
    
    expect(ciphertext).toBe(`kms:${fakeKmsCipher}`);
    expect(kms.encryptWithKms).toHaveBeenCalledWith(plaintext, undefined);
    
    const decrypted = await decryptSecret(ciphertext);
    expect(decrypted).toBe(plaintext);
    expect(kms.decryptWithKms).toHaveBeenCalledWith(fakeKmsCipher, undefined);
  });

  it('should silently fallback to local AES if KMS throws an error', async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.json';
    const plaintext = 'fallback-secret';
    
    // Mock KMS failure
    vi.mocked(kms.encryptWithKms).mockRejectedValue(new Error('KMS Down'));

    const ciphertext = await encryptSecret(plaintext);
    
    // Should fallback to local AES and NOT have kms: prefix
    expect(ciphertext.startsWith('kms:')).toBe(false);
    
    const decrypted = await decryptSecret(ciphertext);
    expect(decrypted).toBe(plaintext);
    
    expect(kms.encryptWithKms).toHaveBeenCalled(); // It tried...
  });

  it('should not fallback to local AES in production when KMS fails', async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.json';
    process.env.NODE_ENV = 'production';
    vi.mocked(kms.encryptWithKms).mockRejectedValue(new Error('KMS Down'));

    await expect(encryptSecret('fallback-secret')).rejects.toThrow('Failed to encrypt with KMS');
  });

  it('should require an explicit KMS key name or all KMS key components', async () => {
    const actualKms = await vi.importActual<typeof import('../../src/lib/kms')>('../../src/lib/kms');
    delete process.env.GCP_KMS_KEY_NAME;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCP_KMS_LOCATION;
    delete process.env.GCP_KMS_KEYRING;
    delete process.env.GCP_KMS_CRYPTOKEY;

    expect(() => actualKms.getKmsKeyName()).toThrow('GCP_KMS_KEY_NAME');
  });
});
