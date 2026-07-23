import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { z } from 'zod';
import { LocalfalconService } from './localfalcon.service';

const triggerScanSchema = z.object({
  orgId: z.string().min(1),
  keyword: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

@Controller('api/localfalcon')
export class LocalfalconController {
  constructor(private readonly lfService: LocalfalconService) {}

  @Post('scan')
  async triggerScan(@Body() body: unknown) {
    const parsed = triggerScanSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        'orgId, keyword, lat, and lng are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { orgId, keyword, lat, lng } = parsed.data;
    return this.lfService.triggerGeoGridScan(orgId, keyword, lat, lng);
  }
}
