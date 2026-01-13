import {
  Controller,
  Get,
  Param,
  Res,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UnsubscribeService } from './unsubscribe.service';

@Controller('unsubscribe')
export class UnsubscribeController {
  private readonly logger = new Logger(UnsubscribeController.name);

  constructor(
    private readonly unsubscribeService: UnsubscribeService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /unsubscribe/:token
   * Public endpoint for unsubscribing from email campaigns
   *
   * Flow:
   * 1. Find recipient by unsubscribe token
   * 2. Revoke contact consent (if granted)
   * 3. Mark recipient as skipped_unsubscribed if pending
   * 4. Redirect to confirmation page
   *
   * Rate limiting: 10 requests per minute per IP
   * No authentication required
   */
  @Get(':token')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per 60 seconds
  async unsubscribe(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Unsubscribe request for token: ${token.substring(0, 8)}...`);

    try {
      await this.unsubscribeService.unsubscribe(token);

      // Redirect to web app confirmation page
      const webAppUrl =
        this.configService.get<string>('WEB_APP_URL') ||
        'http://localhost:3000';
      const redirectUrl = `${webAppUrl}/unsubscribe/${token}?success=true`;

      return res.redirect(302, redirectUrl);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`Invalid unsubscribe token: ${token.substring(0, 8)}...`);
        // Redirect to error page
        const webAppUrl =
          this.configService.get<string>('WEB_APP_URL') ||
          'http://localhost:3000';
        return res.redirect(302, `${webAppUrl}/unsubscribe/${token}?error=invalid`);
      }

      this.logger.error(
        `Error processing unsubscribe for token ${token.substring(0, 8)}...: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Redirect to error page
      const webAppUrl =
        this.configService.get<string>('WEB_APP_URL') ||
        'http://localhost:3000';
      return res.redirect(302, `${webAppUrl}/unsubscribe/${token}?error=server`);
    }
  }
}
