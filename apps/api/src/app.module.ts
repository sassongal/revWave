import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { LocationsModule } from './locations/locations.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SyncModule } from './sync/sync.module';
import { TagsModule } from './tags/tags.module';
import { RedirectModule } from './redirect/redirect.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ContactsModule } from './crm/contacts/contacts.module';
import { CampaignsModule } from './crm/campaigns/campaigns.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.local',
        '.env',
        '../../.env.local',  // Root .env.local (if exists)
        '../../.env',         // Root .env (if exists)
      ],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute (global default)
      },
    ]),
    DatabaseModule,
    CryptoModule,
    HealthModule,
    AuthModule,
    IntegrationsModule,
    LocationsModule,
    ReviewsModule,
    SyncModule,
    TagsModule,
    RedirectModule,
    AnalyticsModule,
    ContactsModule,
    CampaignsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
