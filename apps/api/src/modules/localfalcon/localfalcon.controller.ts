import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { LocalfalconService } from './localfalcon.service';

@Controller('api/localfalcon')
export class LocalfalconController {
  constructor(private readonly lfService: LocalfalconService) {}

  @Post('scan')
  async triggerScan(
    @Body('orgId') orgId: string,
    @Body('keyword') keyword: string,
    @Body('lat') lat: number,
    @Body('lng') lng: number
  ) {
    if (!orgId || !keyword || !lat || !lng) {
      throw new HttpException('orgId, keyword, lat, and lng are required', HttpStatus.BAD_REQUEST);
    }
    
    return this.lfService.triggerGeoGridScan(orgId, keyword, lat, lng);
  }
}
