import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  unsubscribeToken?: string;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<void>;
}

@Injectable()
export class NodemailerEmailProvider implements EmailProvider {
  private readonly logger = new Logger(NodemailerEmailProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // Initialize nodemailer transporter
    // Supports SMTP, SendGrid, or other providers via environment variables
    const emailConfig = {
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: this.configService.get<number>('SMTP_PORT') || 587,
      secure: this.configService.get<string>('SMTP_SECURE') === 'true', // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    };

    // If using SendGrid or other service, use their specific config
    const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendGridApiKey) {
      this.transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: sendGridApiKey,
        },
      });
    } else {
      this.transporter = nodemailer.createTransport(emailConfig);
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, subject, html, unsubscribeToken } = options;

    // Add unsubscribe link to HTML if token provided
    let finalHtml = html;
    if (unsubscribeToken) {
      const baseUrl =
        this.configService.get<string>('WEB_APP_URL') ||
        'http://localhost:3000';
      const unsubscribeUrl = `${baseUrl}/unsubscribe/${unsubscribeToken}`;
      const unsubscribeLink = `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Don't want to receive these emails? <a href="${unsubscribeUrl}">Unsubscribe</a></p>
        </div>
      `;
      finalHtml = html + unsubscribeLink;
    }

    const mailOptions = {
      from:
        this.configService.get<string>('EMAIL_FROM') ||
        this.configService.get<string>('SMTP_USER') ||
        'noreply@revwave.com',
      to,
      subject,
      html: finalHtml,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error}`);
      throw error;
    }
  }
}
