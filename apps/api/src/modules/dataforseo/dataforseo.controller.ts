import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DataforseoService } from './dataforseo.service';

@Controller('api/dataforseo')
export class DataforseoController {
  constructor(private readonly dfsService: DataforseoService) {}

  @Get('keywords')
  async getKeywords(
    @Query('orgId') orgId: string,
    @Query('keyword') keyword: string,
    @Query('location') location: string,
  ) {
    if (!orgId || !keyword) {
      throw new HttpException(
        'orgId and keyword are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.dfsService.getKeywordRankings(
      orgId,
      keyword,
      location || 'United States',
    );
  }
}
