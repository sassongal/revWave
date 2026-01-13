import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NodemailerEmailProvider, EmailProvider } from './providers/email.provider';
import { GmailOAuthEmailProvider } from './providers/gmail-oauth.provider';
import { randomBytes } from 'crypto';

interface CreateCampaignData {
  name: string;
  subject: string;
  bodyHtml: string;
  scheduledAt?: Date;
  createdByUserId: string;
  tenantId: string;
}

interface CampaignReport {
  campaign: {
    id: string;
    name: string;
    subject: string;
    status: string;
    sentAt?: Date;
  };
  stats: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    skipped: number; // Contacts with revoked consent
  };
  recipients: Array<{
    id: string;
    contact: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    status: string;
    sentAt?: Date;
    errorMessage?: string;
  }>;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nodemailerProvider: NodemailerEmailProvider,
    private readonly gmailOAuthProvider: GmailOAuthEmailProvider,
  ) {}

  /**
   * Get the appropriate email provider for the tenant
   * Prefers Gmail OAuth if connected, falls back to SMTP
   */
  private async getEmailProvider(tenantId: string): Promise<{
    provider: EmailProvider;
    useGmail: boolean;
  }> {
    // Check if tenant has Gmail OAuth configured
    const gmailIntegration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
    });

    // Use Gmail OAuth if connected and has gmail.send scope
    const hasGmailScope = gmailIntegration?.scopes?.includes(
      'https://www.googleapis.com/auth/gmail.send',
    );
    const useGmail =
      gmailIntegration?.status === 'connected' && hasGmailScope;

    if (useGmail) {
      this.logger.log(`Using Gmail OAuth for tenant ${tenantId}`);
      return { provider: this.gmailOAuthProvider, useGmail: true };
    }

    this.logger.log(`Using SMTP for tenant ${tenantId}`);
    return { provider: this.nodemailerProvider, useGmail: false };
  }

  /**
   * Find all campaigns for a tenant
   */
  async findAll(tenantId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { tenantId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            recipients: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      subject: campaign.subject,
      status: campaign.status,
      scheduledAt: campaign.scheduledAt,
      sentAt: campaign.sentAt,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      createdBy: campaign.createdBy,
      recipientCount: campaign._count.recipients,
    }));
  }

  /**
   * Find a campaign by ID (tenant-scoped)
   */
  async findOne(id: string, tenantId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  /**
   * Create a new campaign (draft)
   */
  async create(data: CreateCampaignData) {
    this.logger.log(
      `Creating campaign "${data.name}" for tenant ${data.tenantId}`,
    );

    const campaign = await this.prisma.campaign.create({
      data: {
        name: data.name,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        status: 'draft',
        scheduledAt: data.scheduledAt,
        createdByUserId: data.createdByUserId,
        tenantId: data.tenantId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return campaign;
  }

  /**
   * Enqueue campaign sending
   * Creates CampaignRecipient rows for all subscribed contacts (or specified contacts)
   * Excludes contacts with revoked consent
   */
  async enqueueSending(
    campaignId: string,
    tenantId: string,
    contactIds?: string[],
  ) {
    const campaign = await this.findOne(campaignId, tenantId);

    if (campaign.status === 'sent') {
      throw new BadRequestException('Campaign has already been sent');
    }

    this.logger.log(
      `Enqueuing campaign ${campaignId} for sending (tenant ${tenantId})`,
    );

    // Get contacts to send to
    let contacts;
    if (contactIds && contactIds.length > 0) {
      // Send to specific contacts
      contacts = await this.prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          tenantId,
          consentStatus: 'granted', // Only subscribed contacts
        },
      });
    } else {
      // Send to all subscribed contacts
      contacts = await this.prisma.contact.findMany({
        where: {
          tenantId,
          consentStatus: 'granted', // Only subscribed contacts
        },
      });
    }

    // Create CampaignRecipient records with pending status
    const recipients = await Promise.all(
      contacts.map(async (contact) => {
        // Generate unique unsubscribe token
        const unsubscribeToken = randomBytes(32).toString('hex');

        return this.prisma.campaignRecipient.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            status: 'pending',
            unsubscribeToken,
          },
        });
      }),
    );

    // Update campaign status to scheduled
    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'scheduled' },
    });

    this.logger.log(
      `Created ${recipients.length} recipient records for campaign ${campaignId}`,
    );

    // Start sending emails in background (non-blocking)
    this.sendCampaignEmails(campaignId, tenantId).catch((error) => {
      this.logger.error(
        `Error sending campaign ${campaignId}: ${error.message}`,
      );
    });

    return {
      campaignId: campaign.id,
      recipientCount: recipients.length,
      status: 'scheduled',
    };
  }

  /**
   * Send campaign emails sequentially with throttling
   * Processes pending recipients and sends emails
   */
  private async sendCampaignEmails(
    campaignId: string,
    tenantId: string,
  ): Promise<void> {
    this.logger.log(`Starting to send campaign ${campaignId}`);

    const campaign = await this.findOne(campaignId, tenantId);

    // Get the appropriate email provider for this tenant
    const { provider: emailProvider, useGmail } = await this.getEmailProvider(tenantId);

    // Get all pending recipients
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        status: 'pending',
      },
      include: {
        contact: true,
      },
    });

    if (recipients.length === 0) {
      this.logger.warn(`No pending recipients for campaign ${campaignId}`);
      return;
    }

    let sentCount = 0;
    let failedCount = 0;
    const throttleDelay = 100; // 100ms delay between emails (10 emails/second)

    for (const recipient of recipients) {
      try {
        // Skip if contact consent was revoked after recipient was created
        if (recipient.contact.consentStatus !== 'granted') {
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'failed',
              errorMessage: 'Contact consent revoked',
            },
          });
          failedCount++;
          continue;
        }

        // Send email using selected provider
        const emailOptions: any = {
          to: recipient.contact.email,
          subject: campaign.subject,
          html: campaign.bodyHtml,
          unsubscribeToken: recipient.unsubscribeToken || undefined,
        };

        // Gmail OAuth provider needs tenantId
        if (useGmail) {
          emailOptions.tenantId = tenantId;
        }

        await emailProvider.sendEmail(emailOptions);

        // Update recipient status
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });

        sentCount++;

        // Throttle: wait before sending next email
        if (recipients.indexOf(recipient) < recipients.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, throttleDelay));
        }
      } catch (error: any) {
        this.logger.error(
          `Failed to send email to ${recipient.contact.email}: ${error.message}`,
        );

        // Update recipient status to failed
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'failed',
            errorMessage: error.message || 'Failed to send email',
          },
        });

        failedCount++;
      }
    }

    // Update campaign status
    const finalStatus = failedCount === recipients.length ? 'failed' : 'sent';
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed (via ${useGmail ? 'Gmail OAuth' : 'SMTP'})`,
    );
  }

  /**
   * Get campaign delivery report
   */
  async getReport(campaignId: string, tenantId: string): Promise<CampaignReport> {
    const campaign = await this.findOne(campaignId, tenantId);

    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId },
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            consentStatus: true,
          },
        },
      },
    });

    // Calculate stats
    // Skipped = recipients that failed due to revoked consent OR unsubscribed
    const skippedRecipients = recipients.filter(
      (r) =>
        (r.status === 'failed' &&
          r.errorMessage === 'Contact consent revoked') ||
        r.status === 'skipped_unsubscribed',
    );
    const otherFailed = recipients.filter(
      (r) =>
        r.status === 'failed' &&
        r.errorMessage !== 'Contact consent revoked',
    );

    const stats = {
      total: recipients.length,
      pending: recipients.filter((r) => r.status === 'pending').length,
      sent: recipients.filter((r) => r.status === 'sent').length,
      failed: otherFailed.length, // Failed for other reasons (not consent/unsubscribe)
      skipped: skippedRecipients.length, // Skipped due to revoked consent or unsubscribed
    };

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        sentAt: campaign.sentAt || undefined,
      },
      stats,
      recipients: recipients.map((r) => ({
        id: r.id,
        contact: {
          id: r.contact.id,
          email: r.contact.email,
          firstName: r.contact.firstName || undefined,
          lastName: r.contact.lastName || undefined,
        },
        status: r.status,
        sentAt: r.sentAt || undefined,
        errorMessage: r.errorMessage || undefined,
      })),
    };
  }
}
