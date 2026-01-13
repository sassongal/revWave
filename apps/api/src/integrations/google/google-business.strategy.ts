import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleBusinessStrategy extends PassportStrategy(
  Strategy,
  'google-business'
) {
  private readonly logger = new Logger(GoogleBusinessStrategy.name);

  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_BUSINESS_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_BUSINESS_CLIENT_SECRET');
    const apiUrl = configService.get<string>('API_URL') || 'http://localhost:3001';
    const callbackURL =
      configService.get<string>('GOOGLE_BUSINESS_CALLBACK_URL') ||
      `${apiUrl}/integrations/google/callback`;

    if (!clientID || !clientSecret) {
      const errorMsg = 'GOOGLE_BUSINESS_CLIENT_ID and GOOGLE_BUSINESS_CLIENT_SECRET must be set';
      console.error(`[GoogleBusinessStrategy] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/business.manage',
        'https://www.googleapis.com/auth/gmail.send', // Gmail API - send emails
      ],
      accessType: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to get refresh token
      // Removed passReqToCallback: true - causes done callback issues with NestJS Passport
    });

    // Can use this.logger after super() is called
    this.logger.log('GoogleBusinessStrategy initialized successfully');
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: any
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

    return tokenData;
  }
}
