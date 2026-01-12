import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleBusinessStrategy extends PassportStrategy(
  Strategy,
  'google-business'
) {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_BUSINESS_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_BUSINESS_CLIENT_SECRET'),
      callbackURL:
        configService.get<string>('GOOGLE_BUSINESS_CALLBACK_URL') ||
        `${configService.get<string>('API_URL')}/integrations/google/callback`,
      scope: [
        'https://www.googleapis.com/auth/business.manage',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      accessType: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to get refresh token
      passReqToCallback: true, // Pass request to verify callback
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    // Extract token expiration
    const expiresIn = params.expires_in || 3600; // Default 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Extract scopes
    const scopes = params.scope ? params.scope.split(' ') : [];

    // Return token data to be handled by controller
    const tokenData = {
      accessToken,
      refreshToken,
      expiresAt,
      scopes,
      profile: {
        email: profile.emails?.[0]?.value,
        id: profile.id,
      },
    };

    done(null, tokenData);
  }
}
