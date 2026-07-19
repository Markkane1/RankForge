import { Module } from '@nestjs/common';
import { GbpService } from './gbp.service';
import { GbpController } from './gbp.controller';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [SecurityModule],
  providers: [GbpService],
  controllers: [GbpController],
  exports: [GbpService],
})
export class GbpModule {}
