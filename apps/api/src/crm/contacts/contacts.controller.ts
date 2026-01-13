import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { SessionGuard } from '../../common/guards/session.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { GetContactsQueryDto } from './dto/get-contacts-query.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller('contacts')
@UseGuards(SessionGuard, TenantGuard)
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(private readonly contactsService: ContactsService) {}

  /**
   * GET /contacts
   * List contacts for the authenticated tenant
   *
   * Query params:
   * - status: 'subscribed' | 'unsubscribed' | 'all' (optional, default: 'all')
   * - page: number (optional, default: 1)
   * - limit: number (optional, default: 20, max: 100)
   */
  @Get()
  async getContacts(
    @CurrentTenantId() tenantId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetContactsQueryDto,
  ) {
    this.logger.log(
      `Fetching contacts for tenant ${tenantId} with filters: ${JSON.stringify(query)}`,
    );

    const result = await this.contactsService.findAll(tenantId, {
      status: query.status || 'all',
      page: query.page,
      limit: query.limit,
    });

    return {
      success: true,
      ...result,
    };
  }

  /**
   * GET /contacts/:id
   * Get a specific contact by ID
   */
  @Get(':id')
  async getContact(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`Fetching contact ${id} for tenant ${tenantId}`);

    const contact = await this.contactsService.findOne(id, tenantId);

    return {
      success: true,
      contact,
    };
  }

  /**
   * POST /contacts
   * Create a new contact (manual add)
   * REQUIRES: consentStatus must be 'granted' and consentTimestamp must be provided
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createContact(
    @CurrentTenantId() tenantId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateContactDto,
  ) {
    this.logger.log(`Creating contact for tenant ${tenantId}`);

    const contact = await this.contactsService.create({
      email: dto.email,
      phone: dto.phone,
      firstName: dto.firstName,
      lastName: dto.lastName,
      source: dto.source,
      consentStatus: dto.consentStatus,
      consentTimestamp: new Date(dto.consentTimestamp),
      consentSource: dto.consentSource,
      tenantId,
    });

    return {
      success: true,
      contact,
    };
  }

  /**
   * PATCH /contacts/:id
   * Update a contact
   */
  @Patch(':id')
  async updateContact(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateContactDto,
  ) {
    this.logger.log(`Updating contact ${id} for tenant ${tenantId}`);

    const contact = await this.contactsService.update(id, tenantId, dto);

    return {
      success: true,
      contact,
    };
  }

  /**
   * GET /contacts/:id/campaign-history
   * Get campaign history for a contact
   * Returns all campaigns sent to this contact with status
   */
  @Get(':id/campaign-history')
  async getCampaignHistory(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`Fetching campaign history for contact ${id}`);

    const history = await this.contactsService.getCampaignHistory(id, tenantId);

    return {
      success: true,
      history,
    };
  }

  /**
   * POST /contacts/:id/revoke-consent
   * Revoke consent for a contact
   * Sets consentStatus to 'revoked' and blocks future sending
   */
  @Post(':id/revoke-consent')
  @HttpCode(HttpStatus.OK)
  async revokeConsent(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`Revoking consent for contact ${id} (tenant ${tenantId})`);

    const contact = await this.contactsService.revokeConsent(id, tenantId);

    return {
      success: true,
      message: 'Consent revoked successfully',
      contact,
    };
  }
}
