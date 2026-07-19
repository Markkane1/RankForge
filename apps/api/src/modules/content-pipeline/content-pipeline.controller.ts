import { Controller, Post, Get, Put, Delete, Param, Query, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { ContentPipelineService } from './content-pipeline.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Content Calendar & AI Pipeline (Module 4)')
@Controller('api/clients/:id/content-pipeline')
export class ContentPipelineController {
  constructor(private readonly contentPipelineService: ContentPipelineService) {}

  @ApiOperation({ summary: 'Schedule a new GBP post' })
  @ApiResponse({ status: 201, description: 'Post scheduled successfully' })
  @Post('posts')
  async schedulePost(
    @Param('id') clientId: string,
    @Body() body: {
      gbpProfileId: string;
      title: string;
      content: string;
      scheduledAt: string;
      eventType?: string;
      ctaButton?: string;
      ctaUrl?: string;
    }
  ) {
    return this.contentPipelineService.schedulePost(clientId, body);
  }

  @ApiOperation({ summary: 'List scheduled posts for content calendar' })
  @ApiResponse({ status: 200, description: 'List of scheduled posts returned' })
  @Get('posts')
  async listScheduledPosts(
    @Param('id') clientId: string,
    @Query('start') start?: string,
    @Query('end') end?: string
  ) {
    return this.contentPipelineService.listScheduledPosts(clientId, start, end);
  }

  @ApiOperation({ summary: 'Update/reschedule a scheduled post' })
  @ApiResponse({ status: 200, description: 'Scheduled post updated successfully' })
  @Put('posts/:postId')
  async updateScheduledPost(
    @Param('id') clientId: string,
    @Param('postId') postId: string,
    @Body() body: {
      title?: string;
      content?: string;
      scheduledAt?: string;
      status?: string;
    }
  ) {
    return this.contentPipelineService.updateScheduledPost(clientId, postId, body);
  }

  @ApiOperation({ summary: 'Delete a scheduled post' })
  @ApiResponse({ status: 200, description: 'Scheduled post deleted' })
  @Delete('posts/:postId')
  @HttpCode(HttpStatus.OK)
  async deleteScheduledPost(
    @Param('id') clientId: string,
    @Param('postId') postId: string
  ) {
    return this.contentPipelineService.deleteScheduledPost(clientId, postId);
  }

  @ApiOperation({ summary: 'Generate content draft draft using LLM model rules' })
  @ApiResponse({ status: 200, description: 'AI content draft generated successfully' })
  @Post('posts/generate')
  async generateContentDraft(
    @Param('id') clientId: string,
    @Body('topic') topic: string,
    @Body('primaryKeywords') primaryKeywords: string[]
  ) {
    return this.contentPipelineService.generateContentDraft(clientId, topic, primaryKeywords);
  }

  @ApiOperation({ summary: 'Track AI visibility search snippets' })
  @ApiResponse({ status: 200, description: 'Search visibility tracking information' })
  @Get('search-visibility')
  async syncSearchVisibility(
    @Param('id') clientId: string,
    @Query('query') query: string
  ) {
    return this.contentPipelineService.syncSearchVisibility(clientId, query);
  }

  @ApiOperation({ summary: 'Trigger quarterly stale content check' })
  @ApiResponse({ status: 200, description: 'Scanned posts and flagged stale ones' })
  @Post('stale-scan')
  async scanStaleContent(@Param('id') clientId: string) {
    return this.contentPipelineService.scanStaleContent(clientId);
  }
}
