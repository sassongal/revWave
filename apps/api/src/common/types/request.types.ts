import { Request } from 'express';
import { Tenant, Membership, Prisma } from '@prisma/client';
import { Session } from './session.types';

export type UserWithMemberships = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        tenant: true;
      };
    };
  };
}>;

export interface AuthenticatedRequest extends Request {
  session: Session;
  user?: UserWithMemberships;
  tenant?: Tenant;
  tenantId?: string;
  membership?: Membership;
}
