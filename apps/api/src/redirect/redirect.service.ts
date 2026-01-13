import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface TapEventData {
  tagId: string;
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  metadata?: {
    referer?: string;
    acceptLanguage?: string;
  };
}

@Injectable()
export class RedirectService {
  private readonly logger = new Logger(RedirectService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find tag by public code (only active tags)
   */
  async findActiveTag(publicCode: string) {
    this.logger.log(`Looking up tag with code: ${publicCode}`);

    const tag = await this.prisma.tag.findUnique({
      where: {
        publicCode,
      },
      include: {
        location: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Return null if tag doesn't exist or is not active
    if (!tag || tag.status !== 'active') {
      this.logger.warn(
        `Tag ${publicCode} not found or not active (status: ${tag?.status || 'N/A'})`,
      );
      return null;
    }

    return tag;
  }

  /**
   * Log tap event for analytics
   */
  async logTapEvent(data: TapEventData) {
    this.logger.log(`Logging tap event for tag ${data.tagId}`);

    try {
      await this.prisma.tapEvent.create({
        data: {
          tagId: data.tagId,
          tenantId: data.tenantId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata || {},
        },
      });

      this.logger.log(`Tap event logged successfully for tag ${data.tagId}`);
    } catch (error) {
      // Don't fail the redirect if logging fails
      this.logger.error(
        `Failed to log tap event for tag ${data.tagId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get redirect URL for a tag
   *
   * Priority:
   * 1. Location's Google review URL (if location is assigned)
   * 2. Fallback to tenant's main page (if implemented)
   * 3. Generic error page
   */
  getRedirectUrl(tag: any): string {
    // If tag has a location with Google metadata
    if (tag.location?.metadata?.mapsUri) {
      // Use Google Maps review URL from location metadata
      return tag.location.metadata.mapsUri;
    }

    // If tag has location with external ID, construct Google review URL
    if (tag.location?.externalId) {
      // Google Business Profile review URL format
      const locationId = tag.location.externalId;
      return `https://search.google.com/local/writereview?placeid=${locationId}`;
    }

    // Fallback: Redirect to a generic "review us" page
    // In production, this could be a tenant-specific landing page
    this.logger.warn(
      `Tag ${tag.id} has no location or review URL, using fallback`,
    );
    return `https://google.com/search?q=${encodeURIComponent(tag.tenant.name + ' reviews')}`;
  }

  /**
   * Get tap statistics for a tag
   */
  async getTagTapStats(tagId: string) {
    const [totalTaps, last24h, last7d] = await Promise.all([
      this.prisma.tapEvent.count({
        where: { tagId },
      }),
      this.prisma.tapEvent.count({
        where: {
          tagId,
          tappedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.tapEvent.count({
        where: {
          tagId,
          tappedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalTaps,
      last24h,
      last7d,
    };
  }

  /**
   * Get tap statistics for all tags in a tenant
   */
  async getTenantTapStats(tenantId: string) {
    const [totalTaps, uniqueTags, last24h, last7d] = await Promise.all([
      this.prisma.tapEvent.count({
        where: { tenantId },
      }),
      this.prisma.tapEvent.findMany({
        where: { tenantId },
        select: { tagId: true },
        distinct: ['tagId'],
      }),
      this.prisma.tapEvent.count({
        where: {
          tenantId,
          tappedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.tapEvent.count({
        where: {
          tenantId,
          tappedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalTaps,
      uniqueTags: uniqueTags.length,
      last24h,
      last7d,
    };
  }
}
