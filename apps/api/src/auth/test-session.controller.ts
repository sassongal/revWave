import { Controller, Post } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Session } from '../common/types/session.types';
import { Session as ExpressSessionDecorator } from '@nestjs/common';

@Controller('test')
export class TestSessionController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('login')
  async testLogin(@ExpressSessionDecorator() session: Session) {
    // Find dev user and tenant
    const user = await this.prisma.user.findUnique({
      where: { email: 'dev@revwave.local' },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user || !user.memberships[0]) {
      throw new Error('Dev user not found - run seed script');
    }

    // Set session data
    session.userId = user.id;
    session.tenantId = user.memberships[0].tenantId;

    // Save session to Redis
    return new Promise((resolve, reject) => {
      session.save((err) => {
        if (err) reject(err);
        resolve({
          message: 'Session created',
          userId: user.id,
          tenantId: user.memberships[0].tenantId,
        });
      });
    });
  }
}
