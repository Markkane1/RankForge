import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { requireEnv } from '../../env';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;

  private getKey(): Buffer {
    const key = requireEnv('ENCRYPTION_KEY');
    if (!key || key.length !== this.keyLength) {
      throw new Error(`ENCRYPTION_KEY must be exactly ${this.keyLength} bytes`);
    }
    return Buffer.from(key, 'utf-8');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.getKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Format: iv:encrypted:authTag
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  decrypt(text: string): string {
    const parts = text.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const [ivHex, encryptedHex, authTagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.getKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
