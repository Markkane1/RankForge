import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BrightlocalService } from './brightlocal.service';

@Controller('api/brightlocal')
export class BrightlocalController {
  constructor(private readonly blService: BrightlocalService) {}

  @Get('citations')
  async getCitations(
    @Query('orgId') orgId: string,
    @Query('locationId') locationId: string,
  ) {
    if (!orgId || !locationId) {
      throw new HttpException(
        'orgId and locationId are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.blService.getCitationAudits(orgId, locationId);
  }
}
