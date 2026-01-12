import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GoogleApiService } from '../integrations/google/google-api.service';
import { LocationsService } from '../locations/locations.service';
import { ReviewsService } from '../reviews/reviews.service';
import { RepliesService } from '../reviews/replies.service';

export interface SyncResult {
  locationsUpserted: number;
  reviewsNew: number;
  reviewsUpdated: number;
  totalReviewsSynced: number;
  errors: string[];
}

@Injectable()
export class GoogleSyncService {
  private readonly logger = new Logger(GoogleSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleApi: GoogleApiService,
    private readonly locationsService: LocationsService,
    private readonly reviewsService: ReviewsService,
    private readonly repliesService: RepliesService,
  ) {}

  /**
   * Sync all Google Business Profile data for a tenant
   * Fetches locations, then reviews for each location
   * Idempotent: safe to run multiple times
   */
  async syncGoogleData(tenantId: string): Promise<SyncResult> {
    this.logger.log(`Starting Google sync for tenant ${tenantId}`);

    const result: SyncResult = {
      locationsUpserted: 0,
      reviewsNew: 0,
      reviewsUpdated: 0,
      totalReviewsSynced: 0,
      errors: [],
    };

    // Verify Google Business integration exists and is connected
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_business',
        },
      },
    });

    if (!integration) {
      throw new NotFoundException(
        'Google Business Profile integration not found. Please connect your Google Business account first.',
      );
    }

    if (integration.status !== 'connected') {
      throw new Error(
        `Google Business Profile integration is ${integration.status}. Please reconnect your account.`,
      );
    }

    try {
      // Step 1: Sync locations
      this.logger.log(`Fetching locations from Google for tenant ${tenantId}`);
      const googleLocations = await this.googleApi.listLocations(tenantId);

      for (const googleLocation of googleLocations) {
        try {
          // Parse address
          const addressLines =
            googleLocation.storefrontAddress?.addressLines || [];
          const address = addressLines.join(', ');

          // Upsert location
          const location = await this.locationsService.upsert({
            externalId: googleLocation.name,
            name: googleLocation.title,
            address: address || undefined,
            phoneNumber:
              googleLocation.phoneNumbers?.primaryPhone || undefined,
            websiteUrl: googleLocation.websiteUri || undefined,
            metadata: googleLocation,
            integrationId: integration.id,
            tenantId,
          });

          result.locationsUpserted++;
          this.logger.log(`Upserted location: ${location.name}`);

          // Step 2: Sync reviews for this location
          await this.syncLocationReviews(
            tenantId,
            location.id,
            googleLocation.name,
            result,
          );
        } catch (error) {
          const errorMsg = `Failed to sync location ${googleLocation.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Step 3: Update last sync timestamp
      await this.googleApi.updateLastSync(tenantId);

      this.logger.log(
        `Completed Google sync for tenant ${tenantId}: ${result.locationsUpserted} locations, ${result.reviewsNew} new reviews, ${result.reviewsUpdated} updated reviews`,
      );

      return result;
    } catch (error) {
      const errorMsg = `Google sync failed for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.error(errorMsg);
      result.errors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Sync reviews for a specific location
   */
  private async syncLocationReviews(
    tenantId: string,
    locationId: string,
    googleLocationName: string,
    result: SyncResult,
  ): Promise<void> {
    this.logger.log(
      `Fetching reviews for location ${googleLocationName}`,
    );

    try {
      const googleReviews = await this.googleApi.listReviews(
        tenantId,
        googleLocationName,
      );

      for (const googleReview of googleReviews) {
        try {
          // Check if review already exists
          const existingReview = await this.reviewsService.findByExternalId(
            googleReview.reviewId,
            locationId,
            tenantId,
          );

          const isNew = !existingReview;

          // Parse star rating
          const rating = this.parseStarRating(googleReview.starRating);

          // Parse reviewer info
          const reviewerName =
            googleReview.reviewer?.displayName || 'Anonymous';
          const reviewerAvatar = googleReview.reviewer?.profilePhotoUrl;

          // Parse timestamps
          const publishedAt = googleReview.createTime
            ? new Date(googleReview.createTime)
            : new Date();

          // Upsert review
          const review = await this.reviewsService.upsert({
            externalId: googleReview.reviewId,
            rating,
            content: googleReview.comment || undefined,
            reviewerName,
            reviewerAvatar,
            publishedAt,
            metadata: googleReview,
            locationId,
            tenantId,
          });

          // Update reply status based on Google's reviewReply
          await this.updateReviewReplyStatus(
            review.id,
            tenantId,
            googleReview.reviewReply,
          );

          if (isNew) {
            result.reviewsNew++;
          } else {
            result.reviewsUpdated++;
          }

          result.totalReviewsSynced++;
        } catch (error) {
          const errorMsg = `Failed to sync review ${googleReview.reviewId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to fetch reviews for location ${googleLocationName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.error(errorMsg);
      result.errors.push(errorMsg);
    }
  }

  /**
   * Update review reply status based on Google's reviewReply data
   */
  private async updateReviewReplyStatus(
    reviewId: string,
    tenantId: string,
    reviewReply?: { comment?: string; updateTime?: string },
  ): Promise<void> {
    // If Google shows a published reply, mark as 'replied'
    if (reviewReply?.comment) {
      await this.reviewsService.updateReplyStatus(
        reviewId,
        tenantId,
        'replied',
      );
      return;
    }

    // Check if we have a draft reply locally
    const latestReply = await this.repliesService.findLatestDraft(reviewId);
    if (latestReply) {
      await this.reviewsService.updateReplyStatus(
        reviewId,
        tenantId,
        'drafted',
      );
      return;
    }

    // Otherwise, mark as pending
    await this.reviewsService.updateReplyStatus(
      reviewId,
      tenantId,
      'pending',
    );
  }

  /**
   * Parse Google's star rating enum to numeric rating
   */
  private parseStarRating(
    starRating?: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE',
  ): number {
    switch (starRating) {
      case 'ONE':
        return 1;
      case 'TWO':
        return 2;
      case 'THREE':
        return 3;
      case 'FOUR':
        return 4;
      case 'FIVE':
        return 5;
      default:
        return 5; // Default to 5 if missing
    }
  }
}
