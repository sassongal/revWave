import { Request } from 'express';
import { User, Tenant, Membership } from '@prisma/client';
import { Session } from './session.types';

export interface AuthenticatedRequest extends Request {
  session: Session;
  user?: User;
  tenant?: Tenant;
  tenantId?: string;
  membership?: Membership;
}
