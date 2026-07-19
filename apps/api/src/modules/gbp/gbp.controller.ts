import { Controller, Get, Query, Res, Req, HttpException, HttpStatus, Put, Param, Body } from '@nestjs/common';
import { GbpService } from './gbp.service';
import { UpdateGbpProfileDto } from './gbp.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('GBP OAuth')
@Controller('api/gbp/oauth')
export class GbpController {
  constructor(private readonly gbpService: GbpService) {}

  @ApiOperation({ summary: 'Initialize GBP OAuth flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Google Consent Screen' })
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
    @Query('state') clientId: string,
    @Query('error') error: string,
    @Res() res: Response
  ) {
    if (error) {
      // Redirect back to frontend with error
      return res.redirect(`${process.env.FRONTEND_URL}/clients/${clientId}?error=${error}`);
    }

    if (!code || !clientId) {
      throw new HttpException('code and state are required', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.gbpService.handleOAuthCallback(code, clientId);
      // Redirect back to frontend on success
      return res.redirect(`${process.env.FRONTEND_URL}/clients/${clientId}?gbp_connected=true`);
    } catch (err) {
      return res.redirect(`${process.env.FRONTEND_URL}/clients/${clientId}?error=oauth_failed`);
    }
  }

  @ApiOperation({ summary: 'Update GBP Profile' })
  @ApiResponse({ status: 200, description: 'Profile successfully updated and validated' })
  @Put('profile/:clientId')
  async updateProfile(
    @Param('clientId') clientId: string,
    @Body() body: UpdateGbpProfileDto
  ) {
    return this.gbpService.updateProfile(clientId, body);
  }
}
