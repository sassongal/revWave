import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { SessionGuard } from '../common/guards/session.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenantId } from '../common/decorators/current-tenant-id.decorator';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Controller('tags')
@UseGuards(SessionGuard, TenantGuard)
export class TagsController {
  private readonly logger = new Logger(TagsController.name);

  constructor(private readonly tagsService: TagsService) {}

  /**
   * GET /tags
   * List all tags for the authenticated tenant
   */
  @Get()
  async findAll(@CurrentTenantId() tenantId: string) {
    this.logger.log(`Fetching tags for tenant ${tenantId}`);

    const tags = await this.tagsService.findAll(tenantId);

    return {
      success: true,
      data: tags,
    };
  }

  /**
   * GET /tags/stats
   * Get tag statistics for the tenant
   */
  @Get('stats')
  async getStats(@CurrentTenantId() tenantId: string) {
    this.logger.log(`Fetching tag stats for tenant ${tenantId}`);

    const stats = await this.tagsService.getStats(tenantId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * GET /tags/:id
   * Get a single tag by ID
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
  ) {
    this.logger.log(`Fetching tag ${id} for tenant ${tenantId}`);

    const tag = await this.tagsService.findOne(id, tenantId);

    return {
      success: true,
      data: tag,
    };
  }

  /**
   * POST /tags
   * Create a new tag
   *
   * Body:
   * - name: string (optional) - Internal label for the tag
   * - locationId: string (optional) - Associate with a location
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTagDto: CreateTagDto,
    @CurrentTenantId() tenantId: string,
  ) {
    this.logger.log(`Creating tag for tenant ${tenantId}`);

    const tag = await this.tagsService.create(tenantId, createTagDto);

    return {
      success: true,
      data: tag,
      message: 'Tag created successfully',
    };
  }

  /**
   * PATCH /tags/:id
   * Update a tag (assign location, change status, update name)
   *
   * Body:
   * - name: string (optional) - Update internal label
   * - locationId: string (optional) - Assign/reassign location
   * - status: 'active' | 'disabled' | 'lost' (optional) - Update status
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
    @CurrentTenantId() tenantId: string,
  ) {
    this.logger.log(`Updating tag ${id} for tenant ${tenantId}`);

    const tag = await this.tagsService.update(id, tenantId, updateTagDto);

    return {
      success: true,
      data: tag,
      message: 'Tag updated successfully',
    };
  }

  /**
   * DELETE /tags/:id
   * Delete a tag
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
  ) {
    this.logger.log(`Deleting tag ${id} for tenant ${tenantId}`);

    await this.tagsService.remove(id, tenantId);
  }
}
