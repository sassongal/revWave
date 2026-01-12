import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import {
  GoogleLocation,
  GoogleReview,
  GoogleLocationsResponse,
  GoogleReviewsResponse,
  GoogleTokenResponse,
} from './types/google-api.types';

@Injectable()
export class GoogleApiService {
  private readonly logger = new Logger(GoogleApiService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl = 'https://mybusinessbusinessinformation.googleapis.com/v1';
  private readonly reviewsBaseUrl = 'https://mybusiness.googleapis.com/v4';

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly configService: ConfigService,
  ) {
    this.httpClient = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Get a valid access token for the tenant
   * Automatically refreshes if expired
   */
  async getAccessToken(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
    });

    if (!integration) {
      throw new UnauthorizedException('Google Business Profile not connected');
    }

    if (integration.status !== 'connected') {
      throw new UnauthorizedException(
        `Google Business Profile integration is ${integration.status}`,
      );
    }

    if (!integration.accessToken) {
      throw new UnauthorizedException('No access token found');
    }

    // Check if token is expired or about to expire (5 min buffer)
    const now = new Date();
    const expiresAt = integration.tokenExpiresAt;
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiresAt && expiresAt.getTime() - now.getTime() < bufferMs) {
      this.logger.log(
        `Access token expired or expiring soon for tenant ${tenantId}, refreshing...`,
      );
      return await this.refreshAccessToken(tenantId);
    }

    // Decrypt and return valid token
    return this.encryption.decrypt(integration.accessToken);
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
      throw new UnauthorizedException(
        'No refresh token available. Please reconnect Google Business Profile.',
      );
    }

    const refreshToken = this.encryption.decrypt(integration.refreshToken);

    try {
      const response = await this.httpClient.post<GoogleTokenResponse>(
        'https://oauth2.googleapis.com/token',
        {
          client_id: this.configService.get<string>('GOOGLE_BUSINESS_CLIENT_ID'),
          client_secret: this.configService.get<string>(
            'GOOGLE_BUSINESS_CLIENT_SECRET',
          ),
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        },
      );

      const { access_token, expires_in } = response.data;

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // Encrypt and store new access token
      const encryptedAccessToken = this.encryption.encrypt(access_token);

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

      this.logger.log(`Successfully refreshed access token for tenant ${tenantId}`);

      return access_token;
    } catch (error) {
      this.logger.error(
        `Failed to refresh access token for tenant ${tenantId}`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (axios.isAxiosError(error) && error.response?.status === 400) {
        // Refresh token is invalid or expired
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

        throw new UnauthorizedException(
          'Refresh token expired. Please reconnect Google Business Profile.',
        );
      }

      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Make an API request with automatic retry logic
   */
  private async makeApiRequest<T>(
    url: string,
    accessToken: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      data?: any;
      params?: any;
    } = {},
  ): Promise<T> {
    const maxRetries = 3;
    const delays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.httpClient.request<T>({
          url,
          method: options.method || 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: options.data,
          params: options.params,
        });

        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;

        // Don't retry on 4xx errors (except 401 which should have been handled by token refresh)
        if (status && status >= 400 && status < 500 && status !== 401) {
          this.logger.error(
            `API request failed with ${status}`,
            axiosError.response?.data,
          );
          throw new Error(
            `Google API request failed: ${axiosError.response?.statusText || 'Client error'}`,
          );
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          this.logger.error(
            `API request failed after ${maxRetries} attempts`,
            axiosError.message,
          );
          throw new Error('Google API request failed after multiple retries');
        }

        // Wait before retrying
        const delay = delays[attempt];
        this.logger.warn(
          `API request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error('Unexpected error in makeApiRequest');
  }

  /**
   * List all Google Business Profile locations for the tenant
   */
  async listLocations(tenantId: string): Promise<GoogleLocation[]> {
    this.logger.log(`Listing locations for tenant ${tenantId}`);

    const accessToken = await this.getAccessToken(tenantId);

    // First, get the account
    // Note: Google Business Profile API requires account ID to list locations
    // For simplicity, we'll use the accounts.list endpoint to get the first account
    const accountsUrl = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';

    const accountsResponse = await this.makeApiRequest<{ accounts: Array<{ name: string }> }>(
      accountsUrl,
      accessToken,
    );

    if (!accountsResponse.accounts || accountsResponse.accounts.length === 0) {
      this.logger.warn(`No Google Business accounts found for tenant ${tenantId}`);
      return [];
    }

    const accountName = accountsResponse.accounts[0].name;
    this.logger.log(`Using account: ${accountName}`);

    // Now list locations for this account
    const locationsUrl = `${this.baseUrl}/${accountName}/locations`;

    const response = await this.makeApiRequest<GoogleLocationsResponse>(
      locationsUrl,
      accessToken,
      {
        params: {
          readMask: 'name,title,storefrontAddress,phoneNumbers,websiteUri,metadata',
        },
      },
    );

    const locations = response.locations || [];
    this.logger.log(`Found ${locations.length} locations for tenant ${tenantId}`);

    return locations;
  }

  /**
   * List reviews for a specific location
   * @param tenantId - The tenant ID
   * @param locationName - The location resource name (e.g., "locations/{locationId}")
   */
  async listReviews(
    tenantId: string,
    locationName: string,
  ): Promise<GoogleReview[]> {
    this.logger.log(`Listing reviews for location ${locationName}`);

    const accessToken = await this.getAccessToken(tenantId);

    // Google My Business API v4 endpoint for reviews
    const reviewsUrl = `${this.reviewsBaseUrl}/${locationName}/reviews`;

    const response = await this.makeApiRequest<GoogleReviewsResponse>(
      reviewsUrl,
      accessToken,
    );

    const reviews = response.reviews || [];
    this.logger.log(
      `Found ${reviews.length} reviews for location ${locationName}`,
    );

    return reviews;
  }

  /**
   * Update last sync timestamp for the integration
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
