import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { CampaignsService } from './campaigns.service';

@Injectable()
export class CampaignsSchedulerService {
  private readonly logger = new Logger(CampaignsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsService: CampaignsService,
  ) {}

  /**
   * Runs every minute to check for scheduled campaigns that need to be sent
   * Finds campaigns with status='draft' and scheduledAt in the past
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns() {
    this.logger.debug('Checking for scheduled campaigns to send...');

    try {
      // Find campaigns that are scheduled and ready to send
      const campaignsToSend = await this.prisma.campaign.findMany({
        where: {
          status: 'draft',
          scheduledAt: {
            lte: new Date(), // Scheduled time is in the past or now
          },
        },
      });

      if (campaignsToSend.length === 0) {
        this.logger.debug('No scheduled campaigns found');
        return;
      }

      this.logger.log(
        `Found ${campaignsToSend.length} scheduled campaign(s) to send`,
      );

      // Process each campaign
      for (const campaign of campaignsToSend) {
        try {
          this.logger.log(
            `Processing scheduled campaign: ${campaign.id} (${campaign.name})`,
          );

          // Enqueue the campaign for sending
          await this.campaignsService.enqueueSending(campaign.id, campaign.tenantId);

          this.logger.log(
            `Successfully enqueued scheduled campaign: ${campaign.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process scheduled campaign ${campaign.id}:`,
            error,
          );

          // Mark campaign as failed
          await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              status: 'failed',
            },
          });
        }
      }
    } catch (error) {
      this.logger.error('Error processing scheduled campaigns:', error);
    }
  }
}
