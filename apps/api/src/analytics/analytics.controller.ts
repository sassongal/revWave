import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SessionGuard } from '../common/guards/session.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenantId } from '../common/decorators/current-tenant-id.decorator';
import { GetAnalyticsQueryDto } from './dto/get-analytics-query.dto';

@Controller('analytics')
@UseGuards(SessionGuard, TenantGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/summary
   * Get analytics summary for the authenticated tenant
   *
   * Query params:
   * - range: Optional range parameter (e.g., "30d") - currently kept for future use
   *
   * Returns:
   * - tapsThisMonth: Count of taps in current calendar month
   * - newReviews7d: Count of reviews created in last 7 days
   * - avgRating: Average rating from reviews published in last 30 days
   * - topTags: Top 5 tags by all-time tap count
   */
  @Get('summary')
  async getSummary(
    @CurrentTenantId() tenantId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetAnalyticsQueryDto,
  ) {
    this.logger.log(
      `Fetching analytics summary for tenant ${tenantId} with range: ${query.range || 'default'}`,
    );

    const result = await this.analyticsService.getSummary(
      tenantId,
      query.range,
    );

    return {
      success: true,
      ...result,
    };
  }
}
