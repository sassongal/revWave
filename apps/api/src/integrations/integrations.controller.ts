import { Controller, Get, Post, Req, Res, UseGuards, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { SessionGuard } from '../common/guards/session.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenantId } from '../common/decorators/current-tenant-id.decorator';
import { GoogleBusinessAuthGuard } from './google/google-business-auth.guard';
import { GoogleIntegrationsService } from './google/google-integrations.service';
import { GoogleApiService } from './google/google-api.service';
import { Session } from '../common/types/session.types';

interface AuthenticatedRequest {
  user?: any;
  session: Session;
}

@Controller('integrations')
@UseGuards(SessionGuard, TenantGuard)
export class IntegrationsController {
  constructor(
    private readonly googleIntegrations: GoogleIntegrationsService,
    private readonly googleApi: GoogleApiService,
    private readonly configService: ConfigService
  ) {}

  /**
   * GET /integrations
   * Returns integration status for current tenant
   */
  @Get()
  async getIntegrations(@CurrentTenantId() tenantId: string) {
    const isConnected = await this.googleIntegrations.isConnected(tenantId);

    let integration = null;
    if (isConnected) {
      try {
        const fullIntegration = await this.googleIntegrations.getIntegration(tenantId);
        integration = {
          id: fullIntegration.id,
          provider: fullIntegration.provider,
          status: fullIntegration.status,
          scopes: fullIntegration.scopes,
          lastSyncAt: fullIntegration.lastSyncAt,
          createdAt: fullIntegration.createdAt,
          updatedAt: fullIntegration.updatedAt,
          // Don't expose tokens
        };
      } catch (error) {
        // Integration not found
      }
    }

    return {
      google_business: {
        connected: isConnected,
        integration,
      },
    };
  }

  /**
   * POST /integrations/google/connect
   * Initiates Google Business Profile OAuth flow
   */
  @Post('google/connect')
  @UseGuards(GoogleBusinessAuthGuard)
  async connectGoogle() {
    // Passport will handle the redirect to Google
    // This method won't actually be called due to the guard redirecting
  }

  /**
   * GET /integrations/google/callback
   * Handles OAuth callback from Google
   */
  @Get('google/callback')
  @UseGuards(GoogleBusinessAuthGuard)
  async googleCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const tokenData = req.user;
    const tenantId = req.session.tenantId;

    if (!tenantId) {
      const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
      return res.redirect(`${webAppUrl}/dashboard?error=no_tenant`);
    }

    if (!tokenData || !tokenData.accessToken) {
      const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
      return res.redirect(`${webAppUrl}/dashboard?error=integration_failed`);
    }

    try {
      // Store integration with encrypted tokens
      await this.googleIntegrations.storeIntegration(
        tenantId,
        {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          expiresAt: tokenData.expiresAt,
          scopes: tokenData.scopes,
        },
        {
          email: tokenData.profile?.email,
          profileId: tokenData.profile?.id,
        }
      );

      // TODO: Trigger initial sync job here
      // await this.syncService.triggerInitialSync(tenantId);

      // Redirect to reviews page
      const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
      res.redirect(`${webAppUrl}/reviews?connected=true`);
    } catch (error) {
      console.error('Failed to store integration:', error);
      const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
      res.redirect(`${webAppUrl}/dashboard?error=storage_failed`);
    }
  }

  /**
   * POST /integrations/google/disconnect
   * Disconnects Google Business Profile integration
   */
  @Post('google/disconnect')
  async disconnectGoogle(@CurrentTenantId() tenantId: string) {
    await this.googleIntegrations.disconnect(tenantId);

    return {
      success: true,
      message: 'Google Business Profile disconnected',
    };
  }

  /**
   * GET /integrations/google/locations
   * Lists all Google Business Profile locations for the current tenant
   */
  @Get('google/locations')
  async getLocations(@CurrentTenantId() tenantId: string) {
    const locations = await this.googleApi.listLocations(tenantId);

    return {
      success: true,
      count: locations.length,
      locations,
    };
  }

  /**
   * GET /integrations/google/locations/:locationId/reviews
   * Lists reviews for a specific location
   */
  @Get('google/locations/:locationId/reviews')
  async getReviews(
    @CurrentTenantId() tenantId: string,
    @Param('locationId') locationId: string,
  ) {
    // Construct the full location name for the API
    const locationName = `locations/${locationId}`;
    const reviews = await this.googleApi.listReviews(tenantId, locationName);

    return {
      success: true,
      count: reviews.length,
      reviews,
    };
  }
}
