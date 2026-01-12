import {
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Request,
} from '@nestjs/common';
import { GoogleSyncService } from './google-sync.service';
import { SessionGuard } from '../common/guards/session.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenantId } from '../common/decorators/current-tenant-id.decorator';
import { AuthenticatedRequest } from '../common/types/request.types';

@Controller('sync')
@UseGuards(SessionGuard, TenantGuard)
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly googleSyncService: GoogleSyncService) {}

  /**
   * POST /sync/google/run
   * Trigger a full Google Business Profile sync for the authenticated tenant
   */
  @Post('google/run')
  @HttpCode(HttpStatus.OK)
  async syncGoogle(
    @CurrentTenantId() tenantId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;

    this.logger.log(
      `User ${userId} triggered Google sync for tenant ${tenantId}`,
    );

    const result = await this.googleSyncService.syncGoogleData(tenantId);

    return {
      success: true,
      message: 'Google sync completed',
      data: result,
    };
  }
}

