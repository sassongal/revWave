import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface CreateReviewDto {
  externalId: string;
  rating: number;
  content?: string;
  reviewerName: string;
  reviewerAvatar?: string;
  publishedAt: Date;
  metadata?: any;
  locationId: string;
  tenantId: string;
}

interface UpdateReviewDto {
  rating?: number;
  content?: string;
  reviewerName?: string;
  reviewerAvatar?: string;
  publishedAt?: Date;
  repliedStatus?: 'pending' | 'drafted' | 'replied';
  metadata?: any;
}

interface ReviewFilters {
  locationId?: string;
  repliedStatus?: 'pending' | 'drafted' | 'replied';
  rating?: number;
  minRating?: number;
  maxRating?: number;
}

interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly DEFAULT_PAGE_SIZE = 20;
  private readonly MAX_PAGE_SIZE = 50;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all reviews for a tenant with optional filters and pagination
   */
  async findAll(
    tenantId: string,
    filters?: ReviewFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<any>> {
    const where: any = { tenantId };

    if (filters?.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters?.repliedStatus) {
      where.repliedStatus = filters.repliedStatus;
    }

    if (filters?.rating) {
      where.rating = filters.rating;
    }

    if (filters?.minRating || filters?.maxRating) {
      where.rating = {};
      if (filters.minRating) {
        where.rating.gte = filters.minRating;
      }
      if (filters.maxRating) {
        where.rating.lte = filters.maxRating;
      }
    }

    // Pagination
    const page = pagination?.page || 1;
    const pageSize = Math.min(
      pagination?.pageSize || this.DEFAULT_PAGE_SIZE,
      this.MAX_PAGE_SIZE,
    );
    const skip = (page - 1) * pageSize;

    // Get total count and reviews in parallel
    const [totalItems, reviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: {
          location: {
            select: {
              id: true,
              name: true,
              externalId: true,
            },
          },
          replies: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: reviews,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Find a specific review by ID
   */
  async findOne(id: string, tenantId: string) {
    const review = await this.prisma.review.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            externalId: true,
            address: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  /**
   * Find review by external ID (Google review ID)
   */
  async findByExternalId(
    externalId: string,
    locationId: string,
    tenantId: string,
  ) {
    return this.prisma.review.findFirst({
      where: {
        externalId,
        locationId,
        tenantId,
      },
      include: {
        replies: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Create a new review
   */
  async create(data: CreateReviewDto) {
    this.logger.log(
      `Creating review ${data.externalId} for tenant ${data.tenantId}`,
    );

    return this.prisma.review.create({
      data,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            externalId: true,
          },
        },
      },
    });
  }

  /**
   * Update an existing review
   */
  async update(id: string, tenantId: string, data: UpdateReviewDto) {
    // Verify review belongs to tenant
    await this.findOne(id, tenantId);

    this.logger.log(`Updating review ${id} for tenant ${tenantId}`);

    return this.prisma.review.update({
      where: { id },
      data,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            externalId: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Upsert review (create if not exists, update if exists)
   * Used during sync operations
   */
  async upsert(data: CreateReviewDto) {
    this.logger.log(
      `Upserting review ${data.externalId} for tenant ${data.tenantId}`,
    );

    return this.prisma.review.upsert({
      where: {
        locationId_externalId: {
          locationId: data.locationId,
          externalId: data.externalId,
        },
      },
      create: data,
      update: {
        rating: data.rating,
        content: data.content,
        reviewerName: data.reviewerName,
        reviewerAvatar: data.reviewerAvatar,
        publishedAt: data.publishedAt,
        metadata: data.metadata,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            externalId: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Update reply status
   */
  async updateReplyStatus(
    id: string,
    tenantId: string,
    status: 'pending' | 'drafted' | 'replied',
  ) {
    await this.findOne(id, tenantId);

    this.logger.log(
      `Updating reply status for review ${id} to ${status} for tenant ${tenantId}`,
    );

    return this.prisma.review.update({
      where: { id },
      data: { repliedStatus: status },
    });
  }

  /**
   * Delete a review
   */
  async remove(id: string, tenantId: string) {
    // Verify review belongs to tenant
    await this.findOne(id, tenantId);

    this.logger.log(`Deleting review ${id} for tenant ${tenantId}`);

    return this.prisma.review.delete({
      where: { id },
    });
  }

  /**
   * Get review statistics
   */
  async getStats(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) {
      where.locationId = locationId;
    }

    const [
      totalReviews,
      pendingReviews,
      draftedReviews,
      repliedReviews,
      avgRating,
      ratingDistribution,
    ] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.count({
        where: { ...where, repliedStatus: 'pending' },
      }),
      this.prisma.review.count({
        where: { ...where, repliedStatus: 'drafted' },
      }),
      this.prisma.review.count({
        where: { ...where, repliedStatus: 'replied' },
      }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
    ]);

    return {
      totalReviews,
      pendingReviews,
      draftedReviews,
      repliedReviews,
      averageRating: avgRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.reduce(
        (acc, curr) => {
          acc[curr.rating] = curr._count.rating;
          return acc;
        },
        {} as Record<number, number>,
      ),
    };
  }

  /**
   * Get recent reviews (last N days)
   */
  async getRecent(tenantId: string, days: number = 7, limit: number = 10) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.review.findMany({
      where: {
        tenantId,
        publishedAt: {
          gte: since,
        },
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }
}
