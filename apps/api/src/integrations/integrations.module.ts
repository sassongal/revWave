import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { IntegrationsController } from './integrations.controller';
import { GoogleBusinessStrategy } from './google/google-business.strategy';
import { GoogleIntegrationsService } from './google/google-integrations.service';
import { GoogleApiService } from './google/google-api.service';

@Module({
  imports: [PassportModule],
  controllers: [IntegrationsController],
  providers: [GoogleBusinessStrategy, GoogleIntegrationsService, GoogleApiService],
  exports: [GoogleIntegrationsService, GoogleApiService],
})
export class IntegrationsModule {}
