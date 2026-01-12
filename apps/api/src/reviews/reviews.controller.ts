import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { SessionGuard } from '../common/guards/session.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenantId } from '../common/decorators/current-tenant-id.decorator';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';

@Controller('reviews')
@UseGuards(SessionGuard, TenantGuard)
export class ReviewsController {
  private readonly logger = new Logger(ReviewsController.name);

  constructor(private readonly reviewsService: ReviewsService) {}

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
}
