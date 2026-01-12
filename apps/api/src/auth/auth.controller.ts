import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { SessionGuard } from '../common/guards/session.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Tenant, Membership } from '@prisma/client';
import { UserWithMemberships } from '../common/types/request.types';
import { GoogleAuthGuard } from './google-auth.guard';
import { SessionsService } from './sessions.service';
import { Session } from '../common/types/session.types';

interface AuthenticatedRequest extends Request {
  user?: any;
  session: Session;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService
  ) {}
  @Get('me')
  @UseGuards(SessionGuard, TenantGuard)
  async getMe(
    @CurrentUser() user: UserWithMemberships,
    @CurrentTenant() tenant: Tenant,
  ) {
    // Find the membership for this tenant
    const membership = user.memberships?.find(
      (m: Membership) => m.tenantId === tenant.id
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
      },
      role: membership?.role || 'unknown',
    };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Initiates Google OAuth flow
    // Passport will handle the redirect
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const user = req.user;

    if (!user || !user.id || !user.tenantId) {
      // OAuth failed
      const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
      return res.redirect(`${webAppUrl}/login?error=auth_failed`);
    }

    // Create session
    await this.sessionsService.createSession(
      req.session,
      user.id,
      user.tenantId,
      req.ip,
      req.get('user-agent')
    );

    // Redirect to dashboard
    const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
    res.redirect(`${webAppUrl}/dashboard`);
  }
}
