import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { LocationsModule } from './locations/locations.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SyncModule } from './sync/sync.module';

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
    DatabaseModule,
    CryptoModule,
    HealthModule,
    AuthModule,
    IntegrationsModule,
    LocationsModule,
    ReviewsModule,
    SyncModule,
  ],
})
export class AppModule {}
