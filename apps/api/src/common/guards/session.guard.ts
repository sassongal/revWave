import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = request.session;

    // Check if session exists and has userId
    if (!session || !session.userId) {
      console.error('[SessionGuard] No active session or userId missing', {
        hasSession: !!session,
        userId: session?.userId,
        sessionId: session?.id,
      });
      throw new UnauthorizedException('No active session');
    }

    // Fetch user from database
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      console.error('[SessionGuard] User not found in database', {
        userId: session.userId,
      });
      throw new UnauthorizedException('User not found');
    }

    // Attach user to request
    request.user = user;

    return true;
  }
}
