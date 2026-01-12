import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Session } from '../common/types/session.types';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    session: Session,
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Set session data
    session.userId = userId;
    session.tenantId = tenantId;

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save session to Redis (handled by express-session)
    await new Promise<void>((resolve, reject) => {
      session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create Session record in database for tracking
    if (session.id) {
      await this.prisma.session.create({
        data: {
          sessionId: session.id,
          userId,
          tenantId,
          expiresAt,
          ipAddress,
          userAgent,
          data: {
            userId,
            tenantId,
          },
        },
      });
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    // Delete from database
    await this.prisma.session.deleteMany({
      where: { sessionId },
    });

    // Note: Redis session will be automatically cleaned up by express-session
    // when it expires or when session.destroy() is called
  }

  async revokeUserSessions(userId: string): Promise<void> {
    // Delete all sessions for a user from database
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    // Note: Redis sessions will expire naturally
  }
}
