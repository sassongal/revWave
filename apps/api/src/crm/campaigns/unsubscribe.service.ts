import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UnsubscribeService {
  private readonly logger = new Logger(UnsubscribeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process unsubscribe request
   * - Find recipient by token
   * - Revoke contact consent (if granted)
   * - Mark recipient as skipped_unsubscribed if pending
   */
  async unsubscribe(token: string): Promise<{
    success: boolean;
    contactEmail?: string;
  }> {
    this.logger.log(`Processing unsubscribe request for token: ${token.substring(0, 8)}...`);

    // Find recipient by unsubscribe token
    const recipient = await this.prisma.campaignRecipient.findUnique({
      where: {
        unsubscribeToken: token,
      },
      include: {
        contact: true,
      },
    });

    if (!recipient) {
      throw new NotFoundException('Invalid unsubscribe token');
    }

    // Revoke contact consent if currently granted
    if (recipient.contact.consentStatus === 'granted') {
      await this.prisma.contact.update({
        where: { id: recipient.contact.id },
        data: {
          consentStatus: 'revoked',
        },
      });

      this.logger.log(
        `Revoked consent for contact ${recipient.contact.id} (email: ${recipient.contact.email})`,
      );
    }

    // Mark recipient as skipped_unsubscribed if pending
    if (recipient.status === 'pending') {
      await this.prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'skipped_unsubscribed',
          errorMessage: 'Unsubscribed',
        },
      });

      this.logger.log(
        `Marked recipient ${recipient.id} as skipped_unsubscribed`,
      );
    }

    return {
      success: true,
      contactEmail: recipient.contact.email,
    };
  }
}
