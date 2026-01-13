import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  Logger,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { RepliesService } from './replies.service';
import { AiService } from '../ai/ai.service';
import { GoogleApiService } from '../integrations/google/google-api.service';
import { SessionGuard } from '../common/guards/session.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenantId } from '../common/decorators/current-tenant-id.decorator';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';
import { AuthenticatedRequest } from '../common/types/request.types';

@Controller('reviews')
@UseGuards(SessionGuard, TenantGuard)
export class ReviewsController {
  private readonly logger = new Logger(ReviewsController.name);

  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly repliesService: RepliesService,
    private readonly aiService: AiService,
    private readonly googleApiService: GoogleApiService,
  ) {}

  /**
   * GET /reviews
   * Get all reviews for the authenticated tenant with optional filters and pagination
   *
   * Query params:
   * - filter: 'unreplied' | 'pending' | 'drafted' | 'replied' (optional)
   * - locationId: UUID (optional)
   * - page: number (optional, default: 1)
   * - pageSize: number (optional, default: 20, max: 50)
   */
  @Get()
  async getReviews(
    @CurrentTenantId() tenantId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetReviewsQueryDto,
  ) {
    this.logger.log(
      `Fetching reviews for tenant ${tenantId} with filters: ${JSON.stringify(query)}`,
    );

    // Map 'unreplied' to 'pending' for backward compatibility
    const repliedStatus =
      query.filter === 'unreplied' ? 'pending' : query.filter;

    const result = await this.reviewsService.findAll(
      tenantId,
      {
        locationId: query.locationId,
        repliedStatus,
      },
      {
        page: query.page,
        pageSize: query.pageSize,
      },
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * POST /reviews/:id/draft
   * Generate an AI draft reply for a review
   *
   * Response:
   * - draftText: Generated reply text
   * - replyId: UUID of the created draft reply
   */
  @Post(':id/draft')
  @HttpCode(HttpStatus.OK)
  async generateDraft(
    @Param('id') reviewId: string,
    @CurrentTenantId() tenantId: string,
  ) {
    this.logger.log(
      `Generating AI draft for review ${reviewId} (tenant: ${tenantId})`,
    );

    // Fetch the review with location details
    const review = await this.reviewsService.findOne(reviewId, tenantId);

    if (!review) {
      return {
        success: false,
        message: 'Review not found',
      };
    }

    // Check if a draft already exists
    const existingDraft = await this.repliesService.findLatestDraft(reviewId);
    if (existingDraft) {
      this.logger.log(`Draft already exists for review ${reviewId}`);
      return {
        success: true,
        draftText: existingDraft.content,
        replyId: existingDraft.id,
        message: 'Draft already exists',
      };
    }

    // Generate AI draft
    const { draftText, model, hasHebrew } = await this.aiService.generateReplyDraft({
      rating: review.rating,
      content: review.content || undefined,
      reviewerName: review.reviewerName,
      locationName: review.location.name,
    });

    // Validate draft
    const validation = this.aiService.validateDraft(draftText);
    if (!validation.valid) {
      this.logger.error(`Invalid draft generated: ${validation.reason}`);
      return {
        success: false,
        message: `Failed to generate valid draft: ${validation.reason}`,
      };
    }

    // Save draft reply
    const reply = await this.repliesService.create({
      content: draftText,
      isDraft: true,
      aiGenerated: true,
      aiModel: model,
      reviewId,
    });

    // Update review replied status to 'drafted'
    await this.reviewsService.updateReplyStatus(reviewId, tenantId, 'drafted');

    this.logger.log(
      `Created draft reply ${reply.id} for review ${reviewId} (language: ${hasHebrew ? 'Hebrew' : 'English'})`,
    );

    return {
      success: true,
      draftText,
      replyId: reply.id,
      language: hasHebrew ? 'Hebrew' : 'English',
      model,
    };
  }

  /**
   * POST /reviews/:id/reply
   * Publish a reply to Google and update the database
   *
   * Response:
   * - success: boolean
   * - message: string
   * - replyId: UUID of the published reply
   */
  @Post(':id/reply')
  @HttpCode(HttpStatus.OK)
  async publishReply(
    @Param('id') reviewId: string,
    @CurrentTenantId() tenantId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(
      `Publishing reply for review ${reviewId} (tenant: ${tenantId})`,
    );

    try {
      // Verify review belongs to tenant and fetch review with location
      const review = await this.reviewsService.findOne(reviewId, tenantId);

      if (!review) {
        return {
          success: false,
          message: 'Review not found or does not belong to your organization',
        };
      }

      // Check if review has an external ID (required for publishing to Google)
      if (!review.externalId) {
        return {
          success: false,
          message: 'Review does not have a Google review ID',
        };
      }

      // Find the latest draft reply
      const draftReply = await this.repliesService.findLatestDraft(reviewId);

      if (!draftReply) {
        return {
          success: false,
          message: 'No draft reply found for this review',
        };
      }

      // Publish reply to Google using the review's external ID
      await this.googleApiService.publishReply(
        tenantId,
        review.externalId,
        draftReply.content,
      );

      // Mark reply as published in database
      const userId = req.session.userId || 'system';
      const publishedReply = await this.repliesService.publish(
        draftReply.id,
        userId,
      );

      // Update review replied status to 'replied'
      await this.reviewsService.updateReplyStatus(reviewId, tenantId, 'replied');

      this.logger.log(
        `Successfully published reply ${publishedReply.id} for review ${reviewId}`,
      );

      return {
        success: true,
        message: 'Reply published successfully',
        replyId: publishedReply.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to publish reply for review ${reviewId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Update review status to indicate failure
      await this.reviewsService.updateReplyStatus(reviewId, tenantId, 'pending');

      return {
        success: false,
        message: `Failed to publish reply: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
