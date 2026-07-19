import { KeyManagementServiceClient } from '@google-cloud/kms';
import { env } from './env';

let kmsClient: KeyManagementServiceClient | null = null;

try {
  kmsClient = new KeyManagementServiceClient();
} catch (err) {
  console.warn('GCP KMS Client could not be initialized. Fallback will be used if allowed.');
}

/**
 * Returns the fully qualified key name for a given short keyId.
 * e.g., projects/my-project/locations/global/keyRings/my-ring/cryptoKeys/my-key
 */
export function getKmsKeyName(keyId?: string): string {
  // If keyId is already fully qualified, return it
  if (keyId && keyId.startsWith('projects/')) {
    return keyId;
  }

  // Use env defaults if not fully specified
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'default-project';
  const location = process.env.GCP_KMS_LOCATION || 'global';
  const keyRing = process.env.GCP_KMS_KEYRING || 'rankforge-keyring';
  const cryptoKey = keyId || process.env.GCP_KMS_CRYPTOKEY || 'default-key';

  return `projects/${projectId}/locations/${location}/keyRings/${keyRing}/cryptoKeys/${cryptoKey}`;
}

export async function encryptWithKms(plaintext: string, keyId?: string): Promise<string> {
  if (!kmsClient) {
    throw new Error("KMS Client is not initialized.");
  }
  
  const name = getKmsKeyName(keyId);
  const plaintextBuffer = Buffer.from(plaintext, 'utf8');

  const [result] = await kmsClient.encrypt({
    name,
    plaintext: plaintextBuffer,
  });

  if (!result.ciphertext) {
    throw new Error('KMS encryption failed to return ciphertext');
  }

  // Ensure it's a Buffer, then convert to base64
  return Buffer.from(result.ciphertext).toString('base64');
}

export async function decryptWithKms(ciphertextB64: string, keyId?: string): Promise<string> {
  if (!kmsClient) {
    throw new Error("KMS Client is not initialized.");
  }

  const name = getKmsKeyName(keyId);
  const ciphertextBuffer = Buffer.from(ciphertextB64, 'base64');

  const [result] = await kmsClient.decrypt({
    name,
    ciphertext: ciphertextBuffer,
  });

  if (!result.plaintext) {
    throw new Error('KMS decryption failed to return plaintext');
  }

  return Buffer.from(result.plaintext).toString('utf8');
}
