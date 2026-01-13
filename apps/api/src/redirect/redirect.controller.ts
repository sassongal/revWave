import {
  Controller,
  Get,
  Param,
  Res,
  Req,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { RedirectService } from './redirect.service';

@Controller('t')
export class RedirectController {
  private readonly logger = new Logger(RedirectController.name);

  constructor(private readonly redirectService: RedirectService) {}

  /**
   * GET /t/:code
   * Public endpoint for tag redirects
   *
   * Flow:
   * 1. Find tag by publicCode (must be active)
   * 2. Log tap event (analytics)
   * 3. Redirect to location's Google review URL
   *
   * Rate limiting: 10 requests per minute per IP
   */
  @Get(':code')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per 60 seconds
  async redirect(
    @Param('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(`Redirect request for code: ${code}`);

    try {
      // Find tag and validate
      const tag = await this.redirectService.findActiveTag(code);

      if (!tag) {
        throw new NotFoundException(`Tag ${code} not found or is not active`);
      }

      // Extract client info for analytics
      const ipAddress = this.getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'Unknown';

      // Log tap event
      await this.redirectService.logTapEvent({
        tagId: tag.id,
        tenantId: tag.tenantId,
        ipAddress,
        userAgent,
        metadata: {
          referer: req.headers['referer'],
          acceptLanguage: req.headers['accept-language'],
        },
      });

      // Get redirect URL
      const redirectUrl = this.redirectService.getRedirectUrl(tag);

      this.logger.log(
        `Redirecting code ${code} (tag ${tag.id}) to ${redirectUrl}`,
      );

      // 302 redirect
      return res.redirect(302, redirectUrl);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`Tag not found or inactive: ${code}`);
        throw error;
      }

      this.logger.error(
        `Error processing redirect for code ${code}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      throw new NotFoundException(`Tag ${code} not found or is not active`);
    }
  }

  /**
   * Extract client IP address from request
   * Handles proxies and load balancers
   */
  private getClientIp(req: Request): string {
    // Check common proxy headers
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to socket address
    return req.socket.remoteAddress || 'Unknown';
  }
}
