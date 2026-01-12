import { Module } from '@nestjs/common';
import { GoogleSyncService } from './google-sync.service';
import { SyncController } from './sync.controller';
import { IntegrationsModule } from '../integrations/integrations.module';
import { LocationsModule } from '../locations/locations.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [IntegrationsModule, LocationsModule, ReviewsModule],
  providers: [GoogleSyncService],
  controllers: [SyncController],
  exports: [GoogleSyncService],
})
export class SyncModule {}
