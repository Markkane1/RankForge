import { Module } from '@nestjs/common';
import { ContentPipelineService } from './content-pipeline.service';
import { ContentPipelineController } from './content-pipeline.controller';

@Module({
  providers: [ContentPipelineService],
  controllers: [ContentPipelineController],
  exports: [ContentPipelineService],
})
export class ContentPipelineModule {}
