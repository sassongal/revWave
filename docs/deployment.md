# Deployment Guide

Production deployment instructions for revWave.

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Security review completed

## Environment Setup

### Required Services

1. **Database**: Managed PostgreSQL (AWS RDS, Supabase, etc.)
2. **Cache**: Managed Redis (AWS ElastiCache, Upstash, etc.)
3. **API Hosting**: Container platform (AWS ECS, Render, Railway, etc.)
4. **Web Hosting**: Edge platform (Vercel, Netlify, etc.)
5. **Email**: SMTP service (SendGrid, AWS SES, etc.)

## Database Deployment

### 1. Provision Database

```bash
# Example: AWS RDS PostgreSQL
# - Instance class: db.t3.small (minimum)
# - Storage: 20GB SSD (autoscaling enabled)
# - Multi-AZ: Yes (production)
# - Backup retention: 7 days
```

### 2. Configure Connection

```bash
DATABASE_URL="postgresql://username:password@host:5432/revwave?sslmode=require"
```

### 3. Run Migrations

```bash
# From your local machine or CI/CD
pnpm db:generate
pnpm db:migrate
```

**Important**: Never use `db:push` in production. Always use migrations.

## Redis Deployment

### Provision Redis Instance

```bash
# Example: AWS ElastiCache
# - Node type: cache.t3.micro (minimum)
# - Cluster mode: Disabled (single node ok for start)
# - Encryption in-transit: Enabled
# - Encryption at-rest: Enabled
```

### Configure Connection

```bash
REDIS_HOST=your-redis-host.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

## API Deployment

### Container Build

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/

# Install pnpm and dependencies
RUN npm install -g pnpm@9
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY tsconfig.base.json ./

# Build
RUN pnpm --filter api build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001

CMD ["node", "dist/main.js"]
```

### Environment Variables

```bash
NODE_ENV=production
API_PORT=3001
DATABASE_URL=<your-db-url>
REDIS_HOST=<your-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>
SESSION_SECRET=<secure-random-string>
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=https://api.revwave.com/auth/google/callback
OPENAI_API_KEY=<your-openai-key>
ENCRYPTION_KEY=<32-char-random-string>
APP_URL=https://app.revwave.com
COOKIE_DOMAIN=.revwave.com
```

### Health Checks

Configure health check endpoint:
- Path: `/health`
- Interval: 30s
- Timeout: 5s
- Healthy threshold: 2
- Unhealthy threshold: 3

### Scaling

- Minimum instances: 2 (high availability)
- Maximum instances: 10 (autoscaling)
- CPU threshold: 70%
- Memory threshold: 80%

## Web Deployment (Vercel)

### 1. Connect Repository

- Connect GitHub repository to Vercel
- Select `apps/web` as root directory

### 2. Configure Build

**Build Command:**
```bash
cd ../.. && pnpm install && pnpm --filter web build
```

**Output Directory:**
```
apps/web/.next
```

**Install Command:**
```bash
pnpm install
```

### 3. Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://api.revwave.com
```

### 4. Domain Configuration

- Add custom domain: `app.revwave.com`
- Configure SSL (automatic with Vercel)
- Set up redirects if needed

## DNS Configuration

```
# A Records
api.revwave.com    →  <API-load-balancer-IP>
app.revwave.com    →  <Vercel-IP>

# CNAME Records
www.revwave.com    →  app.revwave.com
```

## SSL/TLS

- Use Let's Encrypt for free certificates
- Configure auto-renewal
- Enforce HTTPS redirects
- Set up HSTS headers

## Monitoring

### Application Monitoring

**Sentry** (Error Tracking):
```bash
npm install @sentry/node @sentry/integrations

# In main.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**Health Checks**:
- Uptime monitoring (UptimeRobot, Pingdom)
- Alert on downtime > 1 minute
- Email/SMS notifications

### Infrastructure Monitoring

- Database: CPU, memory, connections, slow queries
- Redis: Memory usage, hit rate, evictions
- API: Response times, error rates, request volume

## Logging

### Structured Logging

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('AppName');

logger.log('Info message', { context });
logger.error('Error message', trace, { context });
logger.warn('Warning message', { context });
```

### Log Aggregation

- CloudWatch Logs (AWS)
- Logtail / Better Stack
- Datadog
- Elasticsearch + Kibana

## Backup & Recovery

### Database Backups

- Automated daily backups
- Retention: 30 days
- Point-in-time recovery enabled
- Test restore process monthly

### Disaster Recovery

- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour
- Backup restore procedures documented
- DR drills quarterly

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/db/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm@9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm --filter api test

      - name: Build
        run: pnpm --filter api build

      - name: Deploy to production
        run: |
          # Deploy to your platform
          # Example: aws ecs update-service ...
```

## Post-Deployment

### Verification

1. Check API health: `https://api.revwave.com/health`
2. Verify web app loads: `https://app.revwave.com`
3. Test authentication flow
4. Verify database connectivity
5. Check Redis sessions
6. Review logs for errors
7. Monitor metrics for anomalies

### Rollback Plan

If deployment fails:
1. Revert to previous container image
2. Restore database if migrations failed
3. Clear Redis cache if needed
4. Monitor for stability
5. Investigate and fix issues
6. Document incident

## Maintenance

### Regular Tasks

- **Weekly**: Review error logs and metrics
- **Monthly**: Security updates and patches
- **Quarterly**: Performance optimization review
- **Annually**: Infrastructure cost optimization

### Updates

- Dependencies: Update monthly (security patches immediately)
- Node.js: Follow LTS releases
- Database: Schedule maintenance windows
- Test all updates in staging first

## Cost Optimization

### Estimated Monthly Costs (Starting Scale)

- Database: $50-100 (RDS db.t3.small)
- Redis: $15-30 (ElastiCache t3.micro)
- API Hosting: $25-50 (2 containers)
- Web Hosting: $20 (Vercel Pro)
- Email: $10-20 (SendGrid)
- Monitoring: $0-29 (Free tiers)
- **Total: ~$120-250/month**

### Scaling Costs

As you grow:
- Database: Upgrade instance class
- Redis: Add replicas
- API: Increase container count
- CDN: Add for static assets
- Monitoring: Upgrade plans

## Security

See [security.md](./security.md) for detailed security considerations.

**Production-specific:**
- Enable WAF (Web Application Firewall)
- Set up DDoS protection
- Configure security groups properly
- Use secrets management (AWS Secrets Manager, Vault)
- Regular security audits
- Vulnerability scanning
