import { Module } from '@nestjs/common';
import { LocalfalconService } from './localfalcon.service';
import { LocalfalconController } from './localfalcon.controller';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [SecurityModule],
  providers: [LocalfalconService],
  controllers: [LocalfalconController],
  exports: [LocalfalconService],
})
export class LocalfalconModule {}
