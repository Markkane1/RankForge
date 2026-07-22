import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  HttpException,
  HttpStatus,
  Put,
  Param,
  Body,
} from '@nestjs/common';
import { GbpService } from './gbp.service';
import { UpdateGbpProfileDto } from './gbp.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { requireEnv } from '../../env';

@ApiTags('GBP OAuth')
@Controller('api/gbp/oauth')
export class GbpController {
  constructor(private readonly gbpService: GbpService) {}

  @ApiOperation({ summary: 'Initialize GBP OAuth flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google Consent Screen',
  })
  @Get('init')
  initOAuth(@Query('clientId') clientId: string, @Res() res: Response) {
    if (!clientId) {
      throw new HttpException('clientId is required', HttpStatus.BAD_REQUEST);
    }
    const url = this.gbpService.getAuthUrl(clientId);
    return res.redirect(url);
  }

  @Get('callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = requireEnv('FRONTEND_URL');

    if (error) {
      return res.redirect(
        `${frontendUrl}/clients?error=${encodeURIComponent(error)}`,
      );
    }

    if (!code || !state) {
      throw new HttpException(
        'code and state are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const clientId = await this.gbpService.handleOAuthCallback(code, state);
      return res.redirect(
        `${frontendUrl}/clients/${clientId}?gbp_connected=true`,
      );
    } catch (err) {
      return res.redirect(`${frontendUrl}/clients?error=oauth_failed`);
    }
  }

  @ApiOperation({ summary: 'Update GBP Profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile successfully updated and validated',
  })
  @Put('profile/:clientId')
  async updateProfile(
    @Param('clientId') clientId: string,
    @Body() body: UpdateGbpProfileDto,
  ) {
    return this.gbpService.updateProfile(clientId, body);
  }
}
