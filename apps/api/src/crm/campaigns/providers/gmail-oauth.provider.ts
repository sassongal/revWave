import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { EmailProvider, SendEmailOptions } from './email.provider';
import { PrismaService } from '../../../database/prisma.service';
import { EncryptionService } from '../../../common/crypto/encryption.service';

/**
 * GmailOAuthEmailProvider sends emails using Gmail API with OAuth 2.0
 *
 * Benefits over SMTP:
 * - Per-tenant email sending (each tenant uses their own Gmail account)
 * - Better security (OAuth tokens instead of static passwords)
 * - Higher sending limits (25,000 emails/day per Gmail account)
 * - Automatic token refresh
 * - Audit trail through Gmail Sent folder
 */
@Injectable()
export class GmailOAuthEmailProvider implements EmailProvider {
  private readonly logger = new Logger(GmailOAuthEmailProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send email using Gmail API with OAuth 2.0
   * Requires tenant to have connected their Gmail account via OAuth
   */
  async sendEmail(options: SendEmailOptions & { tenantId: string }): Promise<void> {
    const { to, subject, html, unsubscribeToken, tenantId } = options;

    try {
      // 1. Get tenant's Gmail OAuth tokens from Integration table
      const integration = await this.prisma.integration.findUnique({
        where: {
          tenantId_provider: {
            tenantId,
            provider: 'google_business', // Reusing Google Business Profile integration
          },
        },
      });

      if (!integration || !integration.accessToken) {
        throw new Error('Gmail OAuth not configured for this tenant');
      }

      if (integration.status !== 'connected') {
        throw new Error(`Gmail integration is ${integration.status}`);
      }

      // 2. Get valid access token (automatically refreshes if needed)
      const accessToken = await this.getAccessToken(tenantId);

      // 3. Create Gmail API client
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>('GOOGLE_BUSINESS_CLIENT_ID'),
        this.configService.get<string>('GOOGLE_BUSINESS_CLIENT_SECRET'),
      );
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // 4. Build email HTML with unsubscribe link if needed
      let finalHtml = html;
      if (unsubscribeToken) {
        const baseUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
        const unsubscribeUrl = `${baseUrl}/unsubscribe/${unsubscribeToken}`;
        const unsubscribeLink = `
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>Don't want to receive these emails? <a href="${unsubscribeUrl}">Unsubscribe</a></p>
          </div>
        `;
        finalHtml = html + unsubscribeLink;
      }

      // 5. Get sender's email from integration metadata or user profile
      const fromEmail = await this.getFromEmail(tenantId);
      const fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'revWave';

      // 6. Create email in RFC 2822 format
      const emailLines = [
        `From: ${fromName} <${fromEmail}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        finalHtml,
      ];
      const email = emailLines.join('\r\n');

      // 7. Encode email in base64url format (Gmail API requirement)
      const base64Email = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 8. Send via Gmail API
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: base64Email,
        },
      });

      this.logger.log(`Email sent via Gmail API to ${to} (message ID: ${result.data.id})`);
    } catch (error: any) {
      this.logger.error(`Failed to send email via Gmail API to ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Get valid access token for tenant
   * Automatically refreshes if expired (similar to GoogleApiService)
   */
  private async getAccessToken(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
    });

    if (!integration || !integration.accessToken) {
      throw new Error('Gmail OAuth not configured for this tenant');
    }

    // Check if token is expired or about to expire (5 min buffer)
    const now = new Date();
    const expiresAt = integration.tokenExpiresAt;
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiresAt && expiresAt.getTime() - now.getTime() < bufferMs) {
      this.logger.log(
        `Gmail access token expired or expiring soon for tenant ${tenantId}, refreshing...`,
      );
      return await this.refreshAccessToken(tenantId);
    }

    // Decrypt and return valid token
    return this.encryptionService.decrypt(integration.accessToken);
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
    });

    if (!integration?.refreshToken) {
      throw new Error(
        'No refresh token available. Please reconnect Gmail.',
      );
    }

    const refreshToken = this.encryptionService.decrypt(integration.refreshToken);

    try {
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>('GOOGLE_BUSINESS_CLIENT_ID'),
        this.configService.get<string>('GOOGLE_BUSINESS_CLIENT_SECRET'),
      );
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      // Refresh the token
      const { credentials } = await oauth2Client.refreshAccessToken();
      const accessToken = credentials.access_token;
      const expiresIn = credentials.expiry_date
        ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
        : 3600; // Default 1 hour

      if (!accessToken) {
        throw new Error('No access token received from refresh');
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Encrypt and store new access token
      const encryptedAccessToken = this.encryptionService.encrypt(accessToken);

      await this.prisma.integration.update({
        where: {
          tenantId_provider: {
            tenantId,
            provider: 'google_business',
          },
        },
        data: {
          accessToken: encryptedAccessToken,
          tokenExpiresAt: expiresAt,
        },
      });

      this.logger.log(`Successfully refreshed Gmail access token for tenant ${tenantId}`);

      return accessToken;
    } catch (error) {
      this.logger.error(
        `Failed to refresh Gmail access token for tenant ${tenantId}`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      // Mark integration as error
      await this.prisma.integration.update({
        where: {
          tenantId_provider: {
            tenantId,
            provider: 'google_business',
          },
        },
        data: {
          status: 'error',
        },
      });

      throw new Error('Failed to refresh Gmail access token. Please reconnect Gmail.');
    }
  }

  /**
   * Get the "from" email address for this tenant
   * Uses the email from the user who connected the Gmail OAuth
   */
  private async getFromEmail(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
    });

    // Try to get email from integration metadata
    if (integration?.metadata && typeof integration.metadata === 'object') {
      const metadata = integration.metadata as any;
      if (metadata.email) {
        return metadata.email;
      }
    }

    // Fallback to getting first user's email via membership
    const membership = await this.prisma.membership.findFirst({
      where: { tenantId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (membership?.user?.email) {
      return membership.user.email;
    }

    // Ultimate fallback
    return this.configService.get<string>('SMTP_USER') || 'noreply@revwave.com';
  }
}
