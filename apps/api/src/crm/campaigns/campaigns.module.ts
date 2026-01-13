import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { UnsubscribeController } from './unsubscribe.controller';
import { UnsubscribeService } from './unsubscribe.service';
import { CampaignsSchedulerService } from './campaigns-scheduler.service';
import { NodemailerEmailProvider } from './providers/email.provider';
import { GmailOAuthEmailProvider } from './providers/gmail-oauth.provider';

@Module({
  controllers: [CampaignsController, UnsubscribeController],
  providers: [
    CampaignsService,
    UnsubscribeService,
    CampaignsSchedulerService,
    NodemailerEmailProvider,
    GmailOAuthEmailProvider,
    {
      provide: 'EmailProvider',
      useClass: NodemailerEmailProvider, // Default provider
    },
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
