import crypto from 'crypto';
import { env } from './env';

// ─── AES-256-GCM encryption for TOTP secrets at rest ───

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derive a 32-byte key from the base64-encoded TWO_FACTOR_ENCRYPTION_KEY.
 * Supports both raw 32-byte keys and base64-encoded keys for convenience.
 */
function deriveKey(): Buffer {
  const raw = env.TWO_FACTOR_ENCRYPTION_KEY;
  // If it decodes from base64 to 32 bytes, use that; otherwise hash it.
  const decoded = Buffer.from(raw, 'base64');
  if (decoded.length === 32) return decoded;
  return crypto.createHash('sha256').update(raw).digest();
}

import { encryptWithKms, decryptWithKms } from './kms';

/**
 * Encrypt a plaintext string (e.g. TOTP secret) using AES-256-GCM,
 * or GCP KMS if configured.
 */
export async function encryptSecret(plaintext: string, keyId?: string): Promise<string> {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Attempt KMS encryption. Prepend 'kms:' to the ciphertext to identify it.
      const kmsEncrypted = await encryptWithKms(plaintext, keyId);
      return `kms:${kmsEncrypted}`;
    }
  } catch (error) {
    console.warn("KMS encryption failed, falling back to local AES-256-GCM:", error);
  }

  // Fallback to local AES-256-GCM
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt an AES-256-GCM or KMS encrypted string back to plaintext.
 */
export async function decryptSecret(ciphertext: string, keyId?: string): Promise<string> {
  // Check if it's a KMS encrypted string
  if (ciphertext.startsWith('kms:')) {
    try {
      const b64 = ciphertext.replace('kms:', '');
      return await decryptWithKms(b64, keyId);
    } catch (error) {
      throw new Error(`Failed to decrypt with KMS: ${error}`);
    }
  }

  // Otherwise, fallback to local AES-256-GCM decryption
  const key = deriveKey();
  const buf = Buffer.from(ciphertext, 'base64');

  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}

// ─── Google webhook HMAC-SHA256 signature verification ───

/**
 * Verify a Google webhook signature (x-goog-signature header).
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyGoogleWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expected, 'utf8'),
    );
  } catch {
    // Length mismatch — always fail
    return false;
  }
}

// ─── Client IP extraction (for rate-limit keying) ───

/**
 * Extract the real client IP from a NextRequest.
 * Respects X-Forwarded-For (set by Caddy reverse proxy) and X-Real-IP.
 */
export function getSignInIp(request: Request): string {
  // NextRequest extends Request but may have headers as Headers object
  const headers = request instanceof Request ? request.headers : (request as any).headers;

  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // X-Forwarded-For: client, proxy1, proxy2 — take the first (real client)
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  return 'unknown';
}
