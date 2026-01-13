import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
  Logger,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Req,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { SessionGuard } from '../../common/guards/session.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { AuthenticatedRequest } from '../../common/types/request.types';

@Controller('campaigns')
@UseGuards(SessionGuard, TenantGuard)
export class CampaignsController {
  private readonly logger = new Logger(CampaignsController.name);

  constructor(private readonly campaignsService: CampaignsService) {}

  /**
   * GET /campaigns
   * List all campaigns for the authenticated tenant
   */
  @Get()
  async getCampaigns(@CurrentTenantId() tenantId: string) {
    this.logger.log(`Fetching campaigns for tenant ${tenantId}`);

    const campaigns = await this.campaignsService.findAll(tenantId);

    return {
      success: true,
      campaigns,
    };
  }

  /**
   * GET /campaigns/:id
   * Get a specific campaign by ID
   */
  @Get(':id')
  async getCampaign(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`Fetching campaign ${id} for tenant ${tenantId}`);

    const campaign = await this.campaignsService.findOne(id, tenantId);

    return {
      success: true,
      campaign,
    };
  }

  /**
   * POST /campaigns
   * Create a new campaign (draft)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(
    @CurrentTenantId() tenantId: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateCampaignDto,
  ) {
    this.logger.log(`Creating campaign for tenant ${tenantId}`);

    const userId = req.user?.id;
    if (!userId) {
      throw new InternalServerErrorException('User ID not found in request');
    }

    const campaign = await this.campaignsService.create({
      name: dto.name,
      subject: dto.subject,
      bodyHtml: dto.bodyHtml,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      createdByUserId: userId,
      tenantId,
    });

    return {
      success: true,
      campaign,
    };
  }

  /**
   * POST /campaigns/:id/send
   * Enqueue campaign sending
   * Creates recipient records and starts sending emails
   */
  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  async sendCampaign(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SendCampaignDto,
  ) {
    this.logger.log(`Enqueuing campaign ${id} for sending (tenant ${tenantId})`);

    const result = await this.campaignsService.enqueueSending(
      id,
      tenantId,
      dto.contactIds,
    );

    return {
      success: true,
      message: 'Campaign sending started',
      ...result,
    };
  }

  /**
   * GET /campaigns/:id/report
   * Get campaign delivery report with counts by status
   */
  @Get(':id/report')
  async getCampaignReport(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`Fetching report for campaign ${id} (tenant ${tenantId})`);

    const report = await this.campaignsService.getReport(id, tenantId);

    return {
      success: true,
      ...report,
    };
  }
}
