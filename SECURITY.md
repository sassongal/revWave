# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. **DO NOT** Open a Public Issue

Please do not create a public GitHub issue for security vulnerabilities. This could put users at risk.

### 2. Report via Email

Send details to: **security@revwave.com** (or create a private security advisory on GitHub)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 3. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

### 4. Disclosure Policy

- We will acknowledge your report within 48 hours
- We will provide regular updates on the fix progress
- We will notify you when the vulnerability is fixed
- We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

### For Users

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique values for `SESSION_SECRET` and `ENCRYPTION_KEY`
   - Rotate secrets regularly in production

2. **OAuth Credentials**
   - Keep Google OAuth credentials secret
   - Use separate credentials for dev/staging/production
   - Enable OAuth consent screen restrictions

3. **Database**
   - Use strong PostgreSQL passwords
   - Enable SSL connections in production
   - Regularly backup your database

4. **Redis**
   - Set a Redis password in production
   - Disable dangerous commands (FLUSHDB, FLUSHALL)
   - Use SSL for Redis connections

5. **Rate Limiting**
   - Configure appropriate rate limits for your use case
   - Monitor for unusual traffic patterns

### For Developers

1. **Code Reviews**
   - All PRs require review before merging
   - Security-sensitive changes require extra scrutiny

2. **Dependencies**
   - Keep dependencies up to date
   - Review dependency security advisories
   - Use `pnpm audit` regularly

3. **Authentication**
   - Always use `SessionGuard` and `TenantGuard` for protected routes
   - Never trust client-provided tenant IDs
   - Validate all user input

4. **Data Encryption**
   - Use `EncryptionService` for sensitive data
   - Never log OAuth tokens or encryption keys
   - Use HTTPS in production

5. **SQL Injection**
   - Always use Prisma's parameterized queries
   - Never construct raw SQL with user input
   - Validate input at API boundaries

## Security Features

### Current Implementation

- ✅ **Session Management**: HttpOnly cookies with Redis backing
- ✅ **Token Encryption**: AES-256-GCM for OAuth tokens at rest
- ✅ **CSRF Protection**: SameSite cookie attribute
- ✅ **Tenant Isolation**: Query-level tenant scoping
- ✅ **Rate Limiting**: Configurable rate limits on endpoints
- ✅ **Input Validation**: class-validator for DTOs
- ✅ **OAuth2**: Secure OAuth implementation with token refresh

### Planned Improvements

- [ ] Two-factor authentication (2FA)
- [ ] Audit logging for sensitive operations
- [ ] IP whitelisting for admin actions
- [ ] Automated security scanning in CI
- [ ] Content Security Policy (CSP) headers
- [ ] Regular security audits

## Known Security Considerations

### Development Environment

- Development uses `localhost` OAuth redirects
- Redis and PostgreSQL run without authentication by default
- Session secrets should be changed in production

### Production Recommendations

1. **HTTPS Only**
   - Use HTTPS for all connections
   - Set `secure: true` for session cookies
   - Enable HSTS headers

2. **Environment Isolation**
   - Separate dev/staging/prod environments
   - Use different OAuth apps per environment
   - Rotate secrets regularly

3. **Monitoring**
   - Set up error tracking (e.g., Sentry)
   - Monitor failed login attempts
   - Track API usage patterns

4. **Backups**
   - Automated database backups
   - Encrypted backup storage
   - Regular restore testing

## Security Update Process

1. Security fix developed privately
2. Patch released with security advisory
3. Users notified via GitHub Security Advisories
4. CVE assigned if applicable
5. Post-mortem published after fix is deployed

## Responsible Disclosure

We appreciate security researchers who responsibly disclose vulnerabilities. We will:

- Acknowledge your contribution
- Credit you in the security advisory (if desired)
- Work with you to understand and fix the issue
- Keep you updated on the fix progress

## Contact

For security concerns: **security@revwave.com**

For general questions: **support@revwave.com**

---

Last updated: 2024-01-12
