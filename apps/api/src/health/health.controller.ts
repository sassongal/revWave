import { Controller, Get } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async root() {
    return {
      service: 'revWave API',
      version: '0.1.0',
      status: 'running',
      endpoints: {
        health: '/health',
        auth: {
          me: '/auth/me',
          google: '/auth/google',
        },
        public: {
          tagRedirect: '/t/:code',
          unsubscribe: '/unsubscribe/:token',
        },
        protected: {
          campaigns: '/campaigns',
          contacts: '/contacts',
          analytics: '/analytics/summary',
        },
      },
      docs: 'See /health for detailed status',
    };
  }

  @Get('health')
  async check() {
    // Test database connection
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    };
  }
}
