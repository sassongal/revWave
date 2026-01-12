import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Membership } from '@prisma/client';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = request.session;

    // SessionGuard should run first
    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get tenantId from session (already validated by SessionGuard)
    const tenantId = session.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('No tenant context');
    }

    // Verify user has membership in this tenant
    const membership = request.user.memberships?.find(
      (m: Membership) => m.tenantId === tenantId
    );

    if (!membership) {
      throw new ForbiddenException('User does not belong to this tenant');
    }

    // Attach tenant and membership to request
    request.tenantId = tenantId;
    request.tenant = membership.tenant;
    request.membership = membership;

    return true;
  }
}
