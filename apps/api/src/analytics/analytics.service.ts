import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface SummaryResult {
  tapsThisMonth: number;
  newReviews7d: number;
  avgRating: number;
  topTags: Array<{
    tagId: string;
    name: string | null;
    publicCode: string;
    tapCount: number;
  }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get analytics summary for a tenant
   * @param tenantId - The tenant ID
   * @param range - Optional range parameter (currently not used, kept for future use)
   */
  async getSummary(tenantId: string, _range?: string): Promise<SummaryResult> {
    this.logger.log(`Fetching analytics summary for tenant ${tenantId}`);

    // Calculate date ranges
    const now = new Date();
    
    // Current month: first day 00:00:00 to last day 23:59:59
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // 7 days ago
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Execute all queries in parallel for performance
    const [
      tapsThisMonth,
      newReviews7d,
      avgRatingResult,
      topTagsData,
    ] = await Promise.all([
      // Taps this month (current calendar month)
      this.prisma.tapEvent.count({
        where: {
          tenantId,
          tappedAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
      }),

      // New reviews in last 7 days (by createdAt)
      this.prisma.review.count({
        where: {
          tenantId,
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),

      // Average rating from reviews published in last 30 days
      this.prisma.review.aggregate({
        where: {
          tenantId,
          publishedAt: {
            gte: thirtyDaysAgo,
          },
        },
        _avg: {
          rating: true,
        },
      }),

      // Top 5 tags by all-time tap count
      this.prisma.tapEvent.groupBy({
        by: ['tagId'],
        where: {
          tenantId,
        },
        _count: {
          tagId: true,
        },
        orderBy: {
          _count: {
            tagId: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Fetch tag details for top tags
    const topTagIds = topTagsData.map((item) => item.tagId);
    const tags = await this.prisma.tag.findMany({
      where: {
        id: {
          in: topTagIds,
        },
        tenantId, // Ensure tenant scoping
      },
      select: {
        id: true,
        name: true,
        publicCode: true,
      },
    });

    // Create a map for quick lookup
    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

    // Build topTags array with tap counts, maintaining order from groupBy
    const topTags = topTagsData
      .map((item) => {
        const tag = tagMap.get(item.tagId);
        if (!tag) {
          return null;
        }
        return {
          tagId: tag.id,
          name: tag.name,
          publicCode: tag.publicCode,
          tapCount: item._count.tagId,
        };
      })
      .filter((tag): tag is NonNullable<typeof tag> => tag !== null);

    // Calculate average rating, rounded to 2 decimal places
    const avgRating = avgRatingResult._avg.rating
      ? Math.round(avgRatingResult._avg.rating * 100) / 100
      : 0;

    this.logger.log(
      `Analytics summary: ${tapsThisMonth} taps, ${newReviews7d} new reviews, ${avgRating} avg rating, ${topTags.length} top tags`,
    );

    return {
      tapsThisMonth,
      newReviews7d,
      avgRating,
      topTags,
    };
  }
}
