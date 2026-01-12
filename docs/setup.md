# Setup Guide

Complete setup instructions for revWave development environment.

## Prerequisites

- Node.js 20 LTS or higher
- pnpm 9 or higher
- Docker and Docker Compose
- Git

## Installation Steps

### 1. Install Node.js and pnpm

```bash
# Install Node.js 20 LTS (using nvm recommended)
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm@9
```

### 2. Clone Repository

```bash
git clone <repository-url>
cd revWave
```

### 3. Install Dependencies

```bash
pnpm install
```

This will install dependencies for all workspace packages.

### 4. Configure Environment Variables

```bash
# Copy root environment template
cp .env.example .env

# Copy app-specific templates
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Edit the `.env` files with your configuration:

**Required for development:**
- `DATABASE_URL` - Already configured for local Docker
- `SESSION_SECRET` - Generate a secure random string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Get from Google Cloud Console
- `OPENAI_API_KEY` - Get from OpenAI

### 5. Start Infrastructure

```bash
# Start all Docker services
pnpm docker:up

# Verify services are running
docker ps
```

You should see 4 containers:
- revwave-postgres
- revwave-redis
- revwave-pgadmin
- revwave-redis-commander

### 6. Setup Database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations to create tables
pnpm db:migrate:dev

# (Optional) Seed database with test data
pnpm db:seed
```

### 7. Start Development Servers

```bash
# Start both API and Web
pnpm dev
```

Or start individually:

```bash
# Terminal 1: API
pnpm dev:api

# Terminal 2: Web
pnpm dev:web
```

## Verification

### Check API

Visit http://localhost:3001/health

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-12T...",
  "uptime": 123.45
}
```

### Check Web App

Visit http://localhost:3000

You should see the revWave welcome page with API status displayed.

### Check Database

Visit http://localhost:5050 (pgAdmin)
- Email: admin@revwave.local
- Password: admin123

### Check Redis

Visit http://localhost:8081 (Redis Commander)

## Common Issues

### Port Already in Use

If you get a port conflict error:

```bash
# Check what's using the port
lsof -i :3000  # or :3001, :5432, etc.

# Kill the process or change the port in .env
```

### Docker Services Won't Start

```bash
# View logs
pnpm docker:logs

# Stop and remove all containers
pnpm docker:down

# Start fresh
pnpm docker:up
```

### Prisma Client Not Found

```bash
# Regenerate Prisma client
pnpm db:generate

# Restart TypeScript server in your IDE
```

### Database Connection Issues

1. Verify Docker container is running: `docker ps`
2. Check DATABASE_URL in .env matches Docker config
3. Try resetting database: `pnpm db:reset` (dev only)

## Next Steps

- Review [Architecture](./architecture.md) to understand the system design
- Check [API Reference](./api-reference.md) for available endpoints
- Read [Security](./security.md) for security considerations
