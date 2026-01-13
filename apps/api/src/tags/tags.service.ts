import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface CreateTagDto {
  name?: string;
  locationId?: string;
}

interface UpdateTagDto {
  name?: string;
  locationId?: string;
  status?: 'active' | 'disabled' | 'lost';
}

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a human-safe public code for tags
   * Format: 3-letter words separated by dash (e.g., "cat-dog-sun")
   */
  private generatePublicCode(): string {
    const words = [
      'ant', 'bat', 'cat', 'dog', 'elk', 'fox', 'gnu', 'hen', 'jay', 'owl',
      'ace', 'bag', 'bin', 'box', 'bus', 'car', 'cup', 'day', 'egg', 'fan',
      'gem', 'hat', 'ice', 'jet', 'key', 'log', 'map', 'net', 'oak', 'pen',
      'red', 'sky', 'sun', 'top', 'van', 'web', 'zoo', 'air', 'bay', 'dew',
    ];

    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const word3 = words[Math.floor(Math.random() * words.length)];

    return `${word1}-${word2}-${word3}`;
  }

  /**
   * Generate a unique public code (retry if collision)
   */
  private async generateUniquePublicCode(): Promise<string> {
    const maxRetries = 10;

    for (let i = 0; i < maxRetries; i++) {
      const code = this.generatePublicCode();

      const existing = await this.prisma.tag.findUnique({
        where: { publicCode: code },
      });

      if (!existing) {
        return code;
      }

      this.logger.warn(`Public code collision: ${code}, retrying...`);
    }

    // Fallback: add random suffix
    const code = this.generatePublicCode();
    const suffix = Math.floor(Math.random() * 1000);
    return `${code}-${suffix}`;
  }

  /**
   * List all tags for a tenant
   */
  async findAll(tenantId: string) {
    this.logger.log(`Fetching tags for tenant ${tenantId}`);

    return this.prisma.tag.findMany({
      where: { tenantId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            tapEvents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single tag by ID (tenant-scoped)
   */
  async findOne(id: string, tenantId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            tapEvents: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  /**
   * Get a tag by public code (for redirect)
   */
  async findByPublicCode(publicCode: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { publicCode },
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

    if (!tag) {
      throw new NotFoundException(`Tag with code ${publicCode} not found`);
    }

    return tag;
  }

  /**
   * Create a new tag
   */
  async create(tenantId: string, data: CreateTagDto) {
    this.logger.log(`Creating tag for tenant ${tenantId}`);

    // Validate location belongs to tenant if provided
    if (data.locationId) {
      const location = await this.prisma.location.findFirst({
        where: {
          id: data.locationId,
          tenantId,
        },
      });

      if (!location) {
        throw new BadRequestException(
          'Location not found or does not belong to your organization',
        );
      }
    }

    // Generate unique public code
    const publicCode = await this.generateUniquePublicCode();

    const tag = await this.prisma.tag.create({
      data: {
        publicCode,
        name: data.name,
        locationId: data.locationId,
        tenantId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Created tag ${tag.id} with public code ${tag.publicCode}`);

    return tag;
  }

  /**
   * Update a tag
   */
  async update(id: string, tenantId: string, data: UpdateTagDto) {
    // Verify tag exists and belongs to tenant
    await this.findOne(id, tenantId);

    this.logger.log(`Updating tag ${id}`);

    // Validate location belongs to tenant if provided
    if (data.locationId) {
      const location = await this.prisma.location.findFirst({
        where: {
          id: data.locationId,
          tenantId,
        },
      });

      if (!location) {
        throw new BadRequestException(
          'Location not found or does not belong to your organization',
        );
      }
    }

    // Validate status if provided
    if (data.status && !['active', 'disabled', 'lost'].includes(data.status)) {
      throw new BadRequestException(
        'Invalid status. Must be: active, disabled, or lost',
      );
    }

    const tag = await this.prisma.tag.update({
      where: { id },
      data: {
        name: data.name,
        locationId: data.locationId,
        status: data.status,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Updated tag ${id}`);

    return tag;
  }

  /**
   * Delete a tag
   */
  async remove(id: string, tenantId: string) {
    // Verify tag exists and belongs to tenant
    await this.findOne(id, tenantId);

    this.logger.log(`Deleting tag ${id}`);

    await this.prisma.tag.delete({
      where: { id },
    });

    this.logger.log(`Deleted tag ${id}`);
  }

  /**
   * Get tag statistics for a tenant
   */
  async getStats(tenantId: string) {
    const [totalTags, activeTags, disabledTags, lostTags, totalTaps] = await Promise.all([
      this.prisma.tag.count({ where: { tenantId } }),
      this.prisma.tag.count({ where: { tenantId, status: 'active' } }),
      this.prisma.tag.count({ where: { tenantId, status: 'disabled' } }),
      this.prisma.tag.count({ where: { tenantId, status: 'lost' } }),
      this.prisma.tapEvent.count({ where: { tenantId } }),
    ]);

    return {
      totalTags,
      activeTags,
      disabledTags,
      lostTags,
      totalTaps,
    };
  }
}
