import { Module } from '@nestjs/common';
import { PageMatrixService } from './page-matrix.service';
import { PageMatrixController } from './page-matrix.controller';

@Module({
  providers: [PageMatrixService],
  controllers: [PageMatrixController],
  exports: [PageMatrixService],
})
export class PageMatrixModule {}
