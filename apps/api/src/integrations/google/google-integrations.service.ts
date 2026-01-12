import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
}

@Injectable()
export class GoogleIntegrationsService {
  private readonly logger = new Logger(GoogleIntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService
  ) {}

  /**
   * Store or update Google Business Profile integration for a tenant
   */
  async storeIntegration(
    tenantId: string,
    tokenData: TokenData,
    metadata?: any
  ): Promise<void> {
    this.logger.log(`Storing Google Business integration for tenant ${tenantId}`);

    // Encrypt tokens
    const encryptedAccessToken = this.encryption.encrypt(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken
      ? this.encryption.encrypt(tokenData.refreshToken)
      : null;

    // Upsert integration
    await this.prisma.integration.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
      create: {
        tenantId,
        provider: 'google_business',
        status: 'connected',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokenData.expiresAt,
        scopes: tokenData.scopes,
        metadata: metadata || {},
      },
      update: {
        status: 'connected',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokenData.expiresAt,
        scopes: tokenData.scopes,
        metadata: metadata || {},
      },
    });

    this.logger.log(`Successfully stored integration for tenant ${tenantId}`);
  }

  /**
   * Get integration for a tenant
   */
  async getIntegration(tenantId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
    });

    if (!integration) {
      throw new NotFoundException('Google Business integration not found');
    }

    return integration;
  }

  /**
   * Get decrypted access token for a tenant
   */
  async getAccessToken(tenantId: string): Promise<string> {
    const integration = await this.getIntegration(tenantId);

    if (!integration.accessToken) {
      throw new Error('No access token found for integration');
    }

    return this.encryption.decrypt(integration.accessToken);
  }

  /**
   * Get decrypted refresh token for a tenant
   */
  async getRefreshToken(tenantId: string): Promise<string | null> {
    const integration = await this.getIntegration(tenantId);

    if (!integration.refreshToken) {
      return null;
    }

    return this.encryption.decrypt(integration.refreshToken);
  }

  /**
   * Check if integration exists and is connected
   */
  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
    });

    return integration?.status === 'connected';
  }

  /**
   * Disconnect integration
   */
  async disconnect(tenantId: string): Promise<void> {
    await this.prisma.integration.update({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
      data: {
        status: 'disconnected',
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
      },
    });

    this.logger.log(`Disconnected Google Business integration for tenant ${tenantId}`);
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(tenantId: string): Promise<void> {
    await this.prisma.integration.update({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
      data: {
        lastSyncAt: new Date(),
      },
    });
  }
}
