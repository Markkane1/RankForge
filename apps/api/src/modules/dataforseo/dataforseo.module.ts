import { Module } from '@nestjs/common';
import { DataforseoService } from './dataforseo.service';
import { DataforseoController } from './dataforseo.controller';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [SecurityModule],
  providers: [DataforseoService],
  controllers: [DataforseoController],
  exports: [DataforseoService],
})
export class DataforseoModule {}
