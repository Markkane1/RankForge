import { Module } from '@nestjs/common';
import { BrightlocalService } from './brightlocal.service';
import { BrightlocalController } from './brightlocal.controller';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [SecurityModule],
  providers: [BrightlocalService],
  controllers: [BrightlocalController],
  exports: [BrightlocalService],
})
export class BrightlocalModule {}
