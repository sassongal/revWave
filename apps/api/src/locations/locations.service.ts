import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface CreateLocationDto {
  externalId: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  metadata?: any;
  integrationId: string;
  tenantId: string;
}

interface UpdateLocationDto {
  name?: string;
  address?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  metadata?: any;
}

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all locations for a tenant
   */
  async findAll(tenantId: string) {
    return this.prisma.location.findMany({
      where: { tenantId },
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
            status: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            tags: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find a specific location by ID
   */
  async findOne(id: string, tenantId: string) {
    const location = await this.prisma.location.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
            status: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            tags: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  /**
   * Find location by external ID (Google location ID)
   */
  async findByExternalId(
    externalId: string,
    integrationId: string,
    tenantId: string,
  ) {
    return this.prisma.location.findFirst({
      where: {
        externalId,
        integrationId,
        tenantId,
      },
    });
  }

  /**
   * Create a new location
   */
  async create(data: CreateLocationDto) {
    this.logger.log(
      `Creating location ${data.name} for tenant ${data.tenantId}`,
    );

    return this.prisma.location.create({
      data,
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Update an existing location
   */
  async update(id: string, tenantId: string, data: UpdateLocationDto) {
    // Verify location belongs to tenant
    await this.findOne(id, tenantId);

    this.logger.log(`Updating location ${id} for tenant ${tenantId}`);

    return this.prisma.location.update({
      where: { id },
      data,
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Upsert location (create if not exists, update if exists)
   * Used during sync operations
   */
  async upsert(data: CreateLocationDto) {
    this.logger.log(
      `Upserting location ${data.externalId} for tenant ${data.tenantId}`,
    );

    return this.prisma.location.upsert({
      where: {
        integrationId_externalId: {
          integrationId: data.integrationId,
          externalId: data.externalId,
        },
      },
      create: data,
      update: {
        name: data.name,
        address: data.address,
        phoneNumber: data.phoneNumber,
        websiteUrl: data.websiteUrl,
        metadata: data.metadata,
      },
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Delete a location
   */
  async remove(id: string, tenantId: string) {
    // Verify location belongs to tenant
    await this.findOne(id, tenantId);

    this.logger.log(`Deleting location ${id} for tenant ${tenantId}`);

    return this.prisma.location.delete({
      where: { id },
    });
  }

  /**
   * Get location statistics
   */
  async getStats(tenantId: string) {
    const [totalLocations, locationsWithReviews] = await Promise.all([
      this.prisma.location.count({
        where: { tenantId },
      }),
      this.prisma.location.count({
        where: {
          tenantId,
          reviews: {
            some: {},
          },
        },
      }),
    ]);

    return {
      totalLocations,
      locationsWithReviews,
      locationsWithoutReviews: totalLocations - locationsWithReviews,
    };
  }
}
