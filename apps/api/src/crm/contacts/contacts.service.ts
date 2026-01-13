import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface CreateContactData {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  source: string;
  consentStatus: string;
  consentTimestamp: Date;
  consentSource?: string;
  tenantId: string;
}

interface UpdateContactData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all contacts for a tenant with optional filtering
   */
  async findAll(
    tenantId: string,
    filters?: {
      status?: 'subscribed' | 'unsubscribed' | 'all';
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // Filter by consent status
    if (filters?.status === 'subscribed') {
      where.consentStatus = 'granted';
    } else if (filters?.status === 'unsubscribed') {
      where.consentStatus = 'revoked';
    }
    // 'all' or undefined means no filter

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Find a contact by ID (tenant-scoped)
   */
  async findOne(id: string, tenantId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return contact;
  }

  /**
   * Create a new contact
   * REQUIRES: consentStatus must be 'granted' and consentTimestamp must be provided
   */
  async create(data: CreateContactData) {
    // Enforce business rule: cannot create contact without granted consent
    if (data.consentStatus !== 'granted') {
      throw new BadRequestException(
        'Cannot create contact without granted consent. consentStatus must be "granted".',
      );
    }

    if (!data.consentTimestamp) {
      throw new BadRequestException(
        'consentTimestamp is required when creating a contact.',
      );
    }

    // Check if contact with same email already exists for this tenant
    const existing = await this.prisma.contact.findUnique({
      where: {
        tenantId_email: {
          tenantId: data.tenantId,
          email: data.email,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Contact with email ${data.email} already exists for this tenant.`,
      );
    }

    this.logger.log(
      `Creating contact for tenant ${data.tenantId} with email ${data.email}`,
    );

    const contact = await this.prisma.contact.create({
      data: {
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        source: data.source,
        consentStatus: data.consentStatus,
        consentTimestamp: data.consentTimestamp,
        consentSource: data.consentSource,
        tenantId: data.tenantId,
      },
    });

    return contact;
  }

  /**
   * Update a contact (tenant-scoped)
   */
  async update(id: string, tenantId: string, data: UpdateContactData) {
    // Verify contact exists and belongs to tenant
    await this.findOne(id, tenantId);

    // If updating email, check for conflicts
    if (data.email) {
      const existing = await this.prisma.contact.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: data.email,
          },
        },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Contact with email ${data.email} already exists for this tenant.`,
        );
      }
    }

    this.logger.log(`Updating contact ${id} for tenant ${tenantId}`);

    const contact = await this.prisma.contact.update({
      where: { id },
      data: {
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    return contact;
  }

  /**
   * Get campaign history for a contact
   * Returns all campaigns sent to this contact
   */
  async getCampaignHistory(id: string, tenantId: string) {
    // Verify contact exists and belongs to tenant
    await this.findOne(id, tenantId);

    this.logger.log(
      `Fetching campaign history for contact ${id}`,
    );

    const history = await this.prisma.campaignRecipient.findMany({
      where: {
        contactId: id,
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            subject: true,
            status: true,
            sentAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return history;
  }

  /**
   * Revoke consent for a contact
   * Sets consentStatus to 'revoked' and prevents future sending
   */
  async revokeConsent(id: string, tenantId: string) {
    const contact = await this.findOne(id, tenantId);

    if (contact.consentStatus === 'revoked') {
      this.logger.warn(
        `Contact ${id} already has revoked consent status`,
      );
      return contact;
    }

    this.logger.log(
      `Revoking consent for contact ${id} (tenant ${tenantId})`,
    );

    const updated = await this.prisma.contact.update({
      where: { id },
      data: {
        consentStatus: 'revoked',
        // Note: consentTimestamp is not updated - we keep the original timestamp
        // to track when consent was originally granted
      },
    });

    return updated;
  }
}
