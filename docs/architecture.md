# Architecture Overview

revWave monorepo architecture and design decisions.

## System Architecture

```
┌─────────────────┐
│   Next.js Web   │
│   (Port 3000)   │
└────────┬────────┘
         │ HTTP/REST
         │ (Axios)
         ▼
┌─────────────────┐
│   NestJS API    │
│   (Port 3001)   │
└────┬─────┬──────┘
     │     │
     │     └──────────┐
     ▼                ▼
┌─────────┐    ┌──────────┐
│PostgreSQL│    │  Redis   │
│  (5432) │    │  (6379)  │
└─────────┘    └──────────┘
```

## Monorepo Structure

### pnpm Workspace

- **Root**: Shared configuration and orchestration scripts
- **apps/api**: NestJS backend application
- **apps/web**: Next.js frontend application
- **packages/db**: Prisma database package (shared)

### Benefits

- Shared TypeScript types via `@revwave/db`
- Single dependency tree (faster installs)
- Coordinated versioning
- Shared linting/formatting rules
- Parallel development workflows

## Data Flow

### Authentication Flow

```
User → Web App → API → Google OAuth
                      ↓
                 Create User/Tenant
                      ↓
                 Set Session Cookie
                      ↓
                   Redirect
```

### Review Management Flow

```
API → Google Business API → Fetch Reviews
  ↓
Store in PostgreSQL
  ↓
Trigger AI Draft
  ↓
Web App displays review + draft
  ↓
User edits and publishes
  ↓
API → Google Business API → Post Reply
```

## Security Architecture

### Tenant Isolation

- Every query scoped to `tenant_id`
- Guards enforce tenant context from authenticated user
- Never trust client-provided tenant IDs
- Database-level indexes for performance

### Session Management

- Redis-backed sessions
- HttpOnly cookies (not accessible to JavaScript)
- 7-day expiration
- Secure flag in production
- SameSite=lax for CSRF protection

### Token Storage

- OAuth tokens encrypted at rest
- AES-256 encryption
- Keys stored in environment variables
- Refresh tokens handled server-side only

## Technology Choices

### Why NestJS?

- Enterprise-ready framework
- Built-in DI and modularity
- TypeScript-first
- Extensive ecosystem
- Great for APIs with complex business logic

### Why Next.js 14 App Router?

- Server components for performance
- Built-in routing and layouts
- API routes for BFF patterns
- Excellent developer experience
- SEO-friendly

### Why PostgreSQL?

- Robust relational database
- ACID compliance
- JSON support for flexible metadata
- Full-text search capabilities
- Proven at scale

### Why Redis?

- Fast session storage
- Pub/sub for future real-time features
- Rate limiting support
- Caching layer

### Why Prisma?

- Type-safe database client
- Excellent TypeScript integration
- Migration management
- Studio for database inspection
- Query optimization

## Module Organization

### API Modules

- **Auth**: Google OAuth, session management
- **Integrations**: Google Business Profile connection
- **Sync**: Background jobs for fetching reviews/locations
- **Reviews**: Review management, drafts, publishing
- **AI**: OpenAI integration for reply generation
- **Tags**: NFC/QR tag management
- **Redirect**: Public redirect endpoint (rate-limited)
- **Contacts**: Mini CRM contact management
- **Campaigns**: Email campaign creation and sending
- **Analytics**: Metrics and reporting

### Web App Organization

- **app/**: Next.js App Router pages
- **components/**: Reusable UI components
- **lib/**: Utilities (API client, helpers)
- **types/**: TypeScript type definitions

## Database Design

### Core Principles

- UUID primary keys for distributed systems
- Timestamps on all tables (createdAt, updatedAt)
- Soft deletes where applicable (status fields)
- Tenant isolation via foreign keys
- Proper indexes for query performance

### Key Relationships

```
User ─< Membership >─ Tenant
                       │
                       ├─< Integration ─< Location ─< Review ─< Reply
                       ├─< Tag ─< TapEvent
                       └─< Contact ─< CampaignRecipient >─ Campaign
```

## Performance Considerations

### Database

- Indexes on frequently queried columns
- Tenant ID indexed on all tables
- Connection pooling via Prisma
- Read replicas for future scaling

### Caching

- Redis for session data
- API response caching (future)
- Prisma query caching

### Frontend

- Server components for initial render
- Client components only where needed
- Image optimization via Next.js
- Code splitting automatic

## Deployment Architecture

### Development

- Docker Compose for local infrastructure
- Hot reload for both API and Web
- Prisma Studio for database inspection

### Production (Future)

- API: Container orchestration (ECS/K8s)
- Web: Vercel or similar edge platform
- Database: Managed PostgreSQL (RDS/Supabase)
- Redis: Managed service (ElastiCache)
- CDN for static assets

## Scalability

### Horizontal Scaling

- API is stateless (sessions in Redis)
- Multiple API instances behind load balancer
- Database connection pooling
- Redis clustering for sessions

### Vertical Scaling

- Database can be upgraded as needed
- Redis memory can be increased
- API containers sized appropriately

## Monitoring & Observability

### Logging

- Structured logging (Winston/Pino)
- Log levels by environment
- Centralized log aggregation (future)

### Metrics

- Health check endpoints
- Uptime monitoring
- Error tracking (Sentry)
- Performance monitoring (future)

### Audit Trail

- OAuth connection/disconnection
- Reply publishing
- Campaign sending
- Contact consent changes
