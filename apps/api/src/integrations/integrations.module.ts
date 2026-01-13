import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { IntegrationsController } from './integrations.controller';
import { GoogleBusinessStrategy } from './google/google-business.strategy';
import { GoogleIntegrationsService } from './google/google-integrations.service';
import { GoogleApiService } from './google/google-api.service';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    PassportModule.register({ session: true }),
    forwardRef(() => SyncModule),
  ],
  controllers: [IntegrationsController],
  providers: [GoogleBusinessStrategy, GoogleIntegrationsService, GoogleApiService],
  exports: [GoogleIntegrationsService, GoogleApiService],
})
export class IntegrationsModule {}
