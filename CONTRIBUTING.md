# Contributing to revWave

First off, thank you for considering contributing to revWave! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Guidelines](#coding-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, Node version, etc.)

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** - why would this be useful?
- **Proposed solution** if you have one
- **Alternative solutions** you've considered

### 🔨 Pull Requests

We actively welcome your pull requests! Here's how:

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js 20 LTS
- pnpm 9+
- Docker & Docker Compose

### Setup Steps

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/revWave.git
   cd revWave
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Start infrastructure**
   ```bash
   pnpm docker:up
   ```

5. **Setup database**
   ```bash
   pnpm db:generate
   pnpm db:migrate:dev
   pnpm db:seed
   ```

6. **Start development servers**
   ```bash
   pnpm dev
   ```

## Coding Guidelines

### TypeScript

- **Use TypeScript** for all new code
- **Enable strict mode** - no `any` types unless absolutely necessary
- **Add JSDoc comments** for public APIs
- **Use meaningful variable names**

### Code Style

We use Prettier and ESLint to enforce code style:

```bash
# Check formatting
pnpm format

# Check linting
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

### File Organization

```
src/
├── module-name/
│   ├── module-name.module.ts      # NestJS module
│   ├── module-name.service.ts     # Business logic
│   ├── module-name.controller.ts  # API endpoints
│   ├── module-name.types.ts       # Type definitions
│   └── module-name.service.spec.ts # Tests
```

### Testing

- Write tests for new features
- Update tests when modifying existing code
- Ensure all tests pass before submitting PR

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov
```

### Database Changes

When making database schema changes:

1. **Update Prisma schema** in `packages/db/prisma/schema.prisma`
2. **Create migration**:
   ```bash
   pnpm db:migrate:dev --name describe_your_change
   ```
3. **Update seed data** if needed
4. **Document the changes** in your PR

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **ci**: CI/CD changes

### Examples

```bash
feat(auth): add Google OAuth integration

Implemented Google OAuth2 authentication flow with session management.
Includes automatic token refresh and secure cookie storage.

Closes #123

---

fix(api): resolve token refresh race condition

Added mutex lock to prevent concurrent token refresh requests
that could cause duplicate database writes.

Fixes #456

---

docs(readme): update setup instructions

Added detailed steps for Google OAuth configuration.
```

### Scope

Common scopes in this project:
- `auth` - Authentication & authorization
- `api` - Backend API
- `web` - Frontend web app
- `db` - Database & migrations
- `integrations` - External integrations (Google, etc.)
- `reviews` - Review management
- `tags` - NFC/QR tag system
- `crm` - CRM functionality
- `campaigns` - Email campaigns

## Pull Request Process

### Before Submitting

1. **Update from main**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Run quality checks**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```

3. **Update documentation** if needed

### PR Template

When creating a PR, please include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Dependent changes merged

## Screenshots (if applicable)

## Related Issues
Closes #(issue number)
```

### Review Process

1. **Automated checks** must pass (linting, tests, build)
2. **Code review** by at least one maintainer
3. **Address feedback** and update PR as needed
4. **Squash and merge** once approved

## Development Tips

### Debugging

#### Backend (NestJS)
```bash
# Start API in debug mode
pnpm dev:api:debug

# Attach debugger in VSCode (port 9229)
```

#### Frontend (Next.js)
```bash
# Next.js has built-in debugging
# Use browser DevTools or VSCode debugger
```

### Database Tools

```bash
# Open Prisma Studio (GUI)
pnpm db:studio

# View database via pgAdmin
# http://localhost:5050

# View Redis via Redis Commander
# http://localhost:8081
```

### Common Issues

#### "Module not found" errors
```bash
# Regenerate Prisma client
pnpm db:generate

# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

#### Database connection errors
```bash
# Restart infrastructure
pnpm docker:down
pnpm docker:up

# Check if services are running
docker ps
```

#### Type errors after schema changes
```bash
# Regenerate Prisma client
pnpm db:generate

# Restart TypeScript server in your IDE
```

## Project-Specific Notes

### Multi-Tenancy

- All database queries must be **tenant-scoped**
- Use `TenantGuard` for all authenticated endpoints
- Never trust `X-Tenant-ID` header - always use session

### Security

- **Never commit** `.env` files
- **Never log** OAuth tokens or sensitive data
- **Encrypt** all OAuth tokens at rest (use `EncryptionService`)
- **Validate** all user input
- **Use parameterized queries** (Prisma does this automatically)

### OAuth Integration

- Test with **Google OAuth Playground** when possible
- **Handle token refresh** automatically
- **Store tokens encrypted** in database
- **Implement retry logic** for API calls

## Getting Help

- 💬 **GitHub Discussions** - General questions and ideas
- 🐛 **GitHub Issues** - Bug reports and feature requests
- 📧 **Email** - support@revwave.com for private inquiries

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes for significant contributions
- README acknowledgments section

Thank you for contributing to revWave! 🌊
