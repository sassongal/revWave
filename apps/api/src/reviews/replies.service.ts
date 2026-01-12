import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface CreateReplyDto {
  content: string;
  isDraft?: boolean;
  publishedBy?: string;
  aiGenerated?: boolean;
  aiModel?: string;
  reviewId: string;
}

interface UpdateReplyDto {
  content?: string;
  isDraft?: boolean;
  publishedAt?: Date;
  publishedBy?: string;
}

@Injectable()
export class RepliesService {
  private readonly logger = new Logger(RepliesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all replies for a review
   */
  async findAll(reviewId: string) {
    return this.prisma.reply.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find a specific reply by ID
   */
  async findOne(id: string) {
    const reply = await this.prisma.reply.findUnique({
      where: { id },
      include: {
        review: {
          select: {
            id: true,
            externalId: true,
            tenantId: true,
            rating: true,
            content: true,
            reviewerName: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new NotFoundException(`Reply with ID ${id} not found`);
    }

    return reply;
  }

  /**
   * Find the latest reply for a review
   */
  async findLatest(reviewId: string) {
    return this.prisma.reply.findFirst({
      where: { reviewId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find the latest draft for a review
   */
  async findLatestDraft(reviewId: string) {
    return this.prisma.reply.findFirst({
      where: {
        reviewId,
        isDraft: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new reply (draft or published)
   */
  async create(data: CreateReplyDto) {
    this.logger.log(
      `Creating ${data.isDraft ? 'draft' : 'published'} reply for review ${data.reviewId}`,
    );

    // If publishing, set publishedAt
    const createData: any = { ...data };
    if (!data.isDraft) {
      createData.publishedAt = new Date();
    }

    return this.prisma.reply.create({
      data: createData,
      include: {
        review: {
          select: {
            id: true,
            externalId: true,
            rating: true,
            reviewerName: true,
          },
        },
      },
    });
  }

  /**
   * Update an existing reply
   */
  async update(id: string, data: UpdateReplyDto) {
    // Verify reply exists
    await this.findOne(id);

    this.logger.log(`Updating reply ${id}`);

    return this.prisma.reply.update({
      where: { id },
      data,
      include: {
        review: {
          select: {
            id: true,
            externalId: true,
            rating: true,
            reviewerName: true,
          },
        },
      },
    });
  }

  /**
   * Publish a draft reply
   */
  async publish(id: string, publishedBy: string) {
    const reply = await this.findOne(id);

    if (!reply.isDraft) {
      throw new Error('Reply is already published');
    }

    this.logger.log(`Publishing reply ${id}`);

    return this.prisma.reply.update({
      where: { id },
      data: {
        isDraft: false,
        publishedAt: new Date(),
        publishedBy,
      },
      include: {
        review: {
          select: {
            id: true,
            externalId: true,
            rating: true,
            reviewerName: true,
            location: {
              select: {
                id: true,
                name: true,
                externalId: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Delete a reply
   */
  async remove(id: string) {
    // Verify reply exists
    await this.findOne(id);

    this.logger.log(`Deleting reply ${id}`);

    return this.prisma.reply.delete({
      where: { id },
    });
  }

  /**
   * Get statistics for AI-generated replies
   */
  async getAiStats(tenantId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { tenantId },
      select: { id: true },
    });

    const reviewIds = reviews.map((r) => r.id);

    const [totalReplies, aiReplies, publishedAiReplies] = await Promise.all([
      this.prisma.reply.count({
        where: { reviewId: { in: reviewIds } },
      }),
      this.prisma.reply.count({
        where: {
          reviewId: { in: reviewIds },
          aiGenerated: true,
        },
      }),
      this.prisma.reply.count({
        where: {
          reviewId: { in: reviewIds },
          aiGenerated: true,
          isDraft: false,
        },
      }),
    ]);

    return {
      totalReplies,
      aiReplies,
      publishedAiReplies,
      aiPercentage: totalReplies > 0 ? (aiReplies / totalReplies) * 100 : 0,
    };
  }

  /**
   * Get drafts that need review
   */
  async getDrafts(tenantId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { tenantId },
      select: { id: true },
    });

    const reviewIds = reviews.map((r) => r.id);

    return this.prisma.reply.findMany({
      where: {
        reviewId: { in: reviewIds },
        isDraft: true,
      },
      include: {
        review: {
          select: {
            id: true,
            externalId: true,
            rating: true,
            content: true,
            reviewerName: true,
            publishedAt: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
