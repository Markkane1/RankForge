import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@rankforge/database';
import { EncryptionService } from './encryption.service';

@Injectable()
export class CredentialsService {
  constructor(private encryptionService: EncryptionService) {}

  async getOrgCredential(organizationId: string, service: string): Promise<string> {
    const cred = await prisma.orgCredential.findFirst({
      where: { organizationId, service, isValid: true }
    });

    if (!cred) {
      throw new NotFoundException(`Valid credential for ${service} not found`);
    }

    return this.encryptionService.decrypt(cred.encryptedKey);
  }

  async setOrgCredential(organizationId: string, service: string, key: string, label?: string): Promise<void> {
    const encryptedKey = this.encryptionService.encrypt(key);
    
    // Invalidate old credentials for this service
    await prisma.orgCredential.updateMany({
      where: { organizationId, service },
      data: { isValid: false }
    });

    await prisma.orgCredential.create({
      data: {
        organizationId,
        service,
        encryptedKey,
        label,
        isValid: true
      }
    });
  }

  async getClientCredential(clientId: string, service: string): Promise<{ token: string; refreshToken?: string }> {
    const cred = await prisma.clientCredential.findFirst({
      where: { clientId, service, isValid: true }
    });

    if (!cred) {
      throw new NotFoundException(`Valid credential for ${service} not found for client`);
    }

    return {
      token: this.encryptionService.decrypt(cred.encryptedToken),
      refreshToken: cred.refreshToken ? this.encryptionService.decrypt(cred.refreshToken) : undefined,
    };
  }

  async setClientCredential(
    clientId: string, 
    service: string, 
    token: string, 
    refreshToken?: string,
    scope?: string,
    tokenExpiryAt?: Date
  ): Promise<void> {
    const encryptedToken = this.encryptionService.encrypt(token);
    const encryptedRefresh = refreshToken ? this.encryptionService.encrypt(refreshToken) : undefined;
    
    // Invalidate old credentials for this service
    await prisma.clientCredential.updateMany({
      where: { clientId, service },
      data: { isValid: false }
    });

    await prisma.clientCredential.create({
      data: {
        clientId,
        service,
        encryptedToken,
        refreshToken: encryptedRefresh,
        scope,
        tokenExpiryAt,
        isValid: true
      }
    });
  }
}
