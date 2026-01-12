import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_AUTH_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_AUTH_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_AUTH_CALLBACK_URL') ||
        `${configService.get<string>('API_URL')}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    const { id, emails, displayName, photos } = profile;

    const email = emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email found in Google profile'), false);
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      // First-time login: Create user, tenant, and membership
      const tenantSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');

      const tenant = await this.prisma.tenant.create({
        data: {
          name: `${displayName}'s Workspace`,
          slug: `${tenantSlug}-${Date.now()}`, // Add timestamp to ensure uniqueness
          timezone: 'America/Los_Angeles', // Default timezone
        },
      });

      user = await this.prisma.user.create({
        data: {
          email,
          name: displayName,
          avatar: photos?.[0]?.value,
          provider: 'google',
          providerId: id,
          memberships: {
            create: {
              tenantId: tenant.id,
              role: 'owner',
            },
          },
        },
        include: {
          memberships: {
            include: {
              tenant: true,
            },
          },
        },
      });
    } else if (user.provider !== 'google' || user.providerId !== id) {
      // Update provider info if needed
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider: 'google',
          providerId: id,
          avatar: photos?.[0]?.value || user.avatar,
        },
        include: {
          memberships: {
            include: {
              tenant: true,
            },
          },
        },
      });
    }

    // Return user with first tenant
    const userWithTenant = {
      ...user,
      tenantId: user.memberships[0]?.tenantId,
    };

    done(null, userWithTenant);
  }
}
