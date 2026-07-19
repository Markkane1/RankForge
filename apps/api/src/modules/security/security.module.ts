import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { CredentialsService } from './credentials.service';

@Module({
  providers: [EncryptionService, CredentialsService],
  exports: [EncryptionService, CredentialsService],
})
export class SecurityModule {}
