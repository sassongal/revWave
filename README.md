# 🌊 revWave

> Digital reputation management SaaS for local businesses, focused on Google Reviews

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)

## ✨ Features

- 🔗 **Google Business Profile Integration** - OAuth2 integration with automatic token refresh
- 💬 **Reviews Inbox** - Centralized review management with AI-powered reply suggestions
- 📱 **Smart NFC/QR Tags** - Intelligent redirect system for review collection
- 👥 **Mini CRM** - Customer contact management and segmentation
- 📧 **Email Campaigns** - Targeted customer engagement campaigns
- 📊 **Analytics Dashboard** - Comprehensive business insights

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks + Server Components

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Authentication**: Passport.js with Google OAuth2
- **Session Management**: Redis + express-session

### Database & Infrastructure
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Cache**: Redis 7
- **Monorepo**: pnpm workspaces

### Security
- **Token Encryption**: AES-256-GCM
- **Session Storage**: HttpOnly cookies with Redis backing
- **OAuth**: Google OAuth2 with automatic token refresh
- **Tenant Isolation**: Row-level security

## 🚀 Quick Start

### Prerequisites

- Node.js 20 LTS or higher
- pnpm 9+
- Docker & Docker Compose

### 1️⃣ Clone and Install

```bash
git clone https://github.com/sassongal/revWave.git
cd revWave
pnpm install
```

### 2️⃣ Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - DATABASE_URL
# - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET (for user auth)
# - GOOGLE_BUSINESS_CLIENT_ID & GOOGLE_BUSINESS_CLIENT_SECRET (for integrations)
# - SESSION_SECRET (generate with: openssl rand -base64 32)
# - ENCRYPTION_KEY (generate with: openssl rand -base64 32)
```

### 3️⃣ Start Infrastructure

```bash
# Start PostgreSQL, Redis, pgAdmin, Redis Commander
pnpm docker:up

# Verify services are running
docker ps
```

### 4️⃣ Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate:dev

# (Optional) Seed development data
pnpm db:seed
```

### 5️⃣ Start Development Servers

```bash
# Start both API and Web concurrently
pnpm dev

# Or start individually:
pnpm dev:api   # http://localhost:3001
pnpm dev:web   # http://localhost:3000
```

## ✅ Verification

Once everything is running, verify the services:

| Service | URL | Credentials |
|---------|-----|-------------|
| Web App | http://localhost:3000 | - |
| API Health | http://localhost:3001/health | - |
| pgAdmin | http://localhost:5050 | admin@revwave.local / admin123 |
| Redis Commander | http://localhost:8081 | - |

## 🔐 Google OAuth Setup

### User Authentication (Login)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Navigate to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen (add your email as test user)
6. Create OAuth client:
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3001/auth/google/callback`
7. Copy credentials to `.env`:
   ```
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

### Google Business Profile Integration

1. In the same Google Cloud project
2. Enable **Google My Business API**
3. Create another OAuth 2.0 Client ID (or use the same)
4. Add redirect URI: `http://localhost:3001/integrations/google/callback`
5. Add to `.env`:
   ```
   GOOGLE_BUSINESS_CLIENT_ID="your-business-client-id"
   GOOGLE_BUSINESS_CLIENT_SECRET="your-business-client-secret"
   ```

## 📁 Project Structure

```
revWave/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/          # Authentication (Google OAuth, sessions)
│   │   │   ├── integrations/  # Google Business Profile integration
│   │   │   ├── common/        # Guards, decorators, crypto
│   │   │   ├── database/      # Prisma service
│   │   │   └── health/        # Health check endpoint
│   │   └── test/
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/           # App router pages
│       │   ├── components/    # React components
│       │   └── lib/           # Utilities, API client
│       └── public/
├── packages/
│   └── db/                     # Shared Prisma schema
│       ├── prisma/
│       │   ├── schema.prisma  # Database schema
│       │   ├── migrations/    # Migration history
│       │   └── seed.ts        # Seed data
│       └── src/
├── infra/                      # Docker infrastructure
│   └── docker-compose.yml
├── docs/                       # Documentation
└── package.json                # Root package.json
```

## 🛠️ Available Scripts

### Development

```bash
pnpm dev              # Start all apps in development mode
pnpm dev:api          # Start API only
pnpm dev:web          # Start web only
```

### Database

```bash
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run production migrations
pnpm db:migrate:dev   # Run development migrations
pnpm db:push          # Push schema to database (dev only)
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database
pnpm db:reset         # Reset database (dev only)
```

### Docker

```bash
pnpm docker:up        # Start infrastructure
pnpm docker:down      # Stop infrastructure
pnpm docker:logs      # View logs
```

### Code Quality

```bash
pnpm lint             # Lint all packages
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code with Prettier
pnpm typecheck        # Type check all packages
pnpm test             # Run tests
```

### Build

```bash
pnpm build            # Build all packages
pnpm build:api        # Build API only
pnpm build:web        # Build web only
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests for specific module
pnpm test contacts.service.spec.ts
pnpm test campaigns.service.spec.ts
pnpm test unsubscribe.service.spec.ts

# Run tests with coverage
pnpm test:cov
```

### Manual Test Flow

#### 1. **Start services**:
   ```bash
   pnpm docker:up
   pnpm db:generate
   pnpm db:migrate:dev
   pnpm dev
   ```

#### 2. **Test Authentication**:
   - Visit http://localhost:3000
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Should redirect to dashboard
   - Verify session cookie is set (HttpOnly)

#### 3. **Test Contacts Management**:
   - Navigate to `/crm/contacts`
   - Click "Add Contact"
   - Fill form: email (required), name, phone, source
   - Submit and verify contact appears in table
   - Test "Revoke Consent" action
   - Verify contact status changes to "Unsubscribed"

#### 4. **Test Campaign Creation**:
   - Navigate to `/crm/campaigns`
   - Click "New Campaign"
   - Fill form:
     - Name: "Test Campaign"
     - Subject: "Test Email"
     - Body (HTML): `<h1>Hello</h1><p>This is a test email.</p>`
   - Submit and verify redirect to campaign detail page

#### 5. **Test Campaign Sending**:
   - On campaign detail page, click "Send Campaign"
   - Confirm sending
   - Verify:
     - Campaign status changes to "scheduled" then "sent"
     - Recipients are created (only for subscribed contacts)
     - Delivery report shows stats (total, sent, failed, skipped)

#### 6. **Test Unsubscribe Flow**:
   - Find a campaign recipient with unsubscribe token
   - Visit: `http://localhost:3000/unsubscribe/{token}`
   - Verify:
     - Page redirects to API endpoint
     - API processes unsubscribe
     - Redirects back with success message
     - Contact consent status is revoked
     - Recipient status is `skipped_unsubscribed` (if pending)

#### 7. **Test API Endpoints**:
   ```bash
   # Check health
   curl http://localhost:3001/health

   # Get campaigns (requires auth cookie)
   curl -b cookies.txt http://localhost:3001/campaigns

   # Create campaign (requires auth cookie)
   curl -X POST -b cookies.txt \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","subject":"Test","bodyHtml":"<p>Test</p>"}' \
     http://localhost:3001/campaigns

   # Test unsubscribe (public, no auth)
   curl http://localhost:3001/unsubscribe/{valid-token}
   ```

#### 8. **Verify Database**:
   - Open pgAdmin: http://localhost:5050
   - Check tables:
     - `contacts` - verify tenant scoping
     - `campaigns` - verify tenant scoping
     - `campaign_recipients` - verify unsubscribe tokens
     - Verify all queries include `tenant_id` filter

## 📊 Database Schema

The application uses a multi-tenant architecture with the following core models:

- **User** - Application users (Google OAuth)
- **Tenant** - Customer organizations (auto-created on first login)
- **Membership** - User-to-Tenant relationships with roles
- **Session** - Server-side session storage
- **Integration** - Google Business Profile connections (encrypted tokens)
- **Location** - Business locations from Google
- **Review** - Customer reviews
- **Tag** - NFC/QR tags for review collection
- **Contact** - CRM contacts
- **Campaign** - Email campaigns

## 🔒 Security

- ✅ **HttpOnly Cookies** - Session cookies not accessible via JavaScript
- ✅ **Token Encryption** - OAuth tokens encrypted at rest with AES-256-GCM
- ✅ **Tenant Isolation** - All queries scoped to tenant context
- ✅ **CSRF Protection** - SameSite cookie attribute
- ✅ **Rate Limiting** - Configurable rate limits on public endpoints
- ✅ **Environment Variables** - Sensitive config never committed

## 📚 Documentation

- [Setup Guide](./docs/setup.md)
- [Architecture](./docs/architecture.md)
- [API Reference](./docs/api-reference.md)
- [Security](./docs/security.md)
- [Deployment](./docs/deployment.md)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [NestJS](https://nestjs.com/)
- Database by [Prisma](https://www.prisma.io/)
- Deployed on [Vercel](https://vercel.com/) (frontend) and [Railway](https://railway.app/) (backend)

## 📞 Support

- 📧 Email: support@revwave.com
- 🐛 Issues: [GitHub Issues](https://github.com/sassongal/revWave/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/sassongal/revWave/discussions)

---

Made with ❤️ for local businesses
