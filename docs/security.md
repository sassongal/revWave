# Security Considerations

Security best practices and implementation details for revWave.

## Authentication & Authorization

### Google OAuth

- Primary authentication method
- User email as unique identifier
- Profile information stored securely
- Tokens handled server-side only

### Session Management

**Implementation:**
- Redis-backed sessions
- HttpOnly cookies (not accessible via JavaScript)
- Secure flag in production (HTTPS only)
- SameSite=lax for CSRF protection
- 7-day expiration with sliding window

**Best Practices:**
- Never expose session tokens to client
- Regenerate session ID after login
- Clear sessions on logout
- Monitor for session fixation attacks

## Tenant Isolation

**Critical Security Requirement**

Every database query MUST be scoped to the authenticated user's tenant.

### Implementation

1. **Guard Level**: `TenantGuard` validates tenant context
2. **Decorator**: `@CurrentTenant()` injects tenant ID
3. **Interceptor**: `TenantIsolationInterceptor` validates tenant access
4. **Database**: All queries include `tenantId` filter

### Rules

- NEVER trust tenant ID from client requests
- ALWAYS derive tenant from authenticated user
- NEVER allow cross-tenant data access
- ALWAYS validate tenant ownership for resources

**Example:**
```typescript
// WRONG - trusts client
async getReview(@Param('id') id: string, @Body('tenantId') tenantId: string) {
  return this.reviewsService.findOne(id, tenantId);
}

// CORRECT - derives from auth
async getReview(@Param('id') id: string, @CurrentTenant() tenantId: string) {
  return this.reviewsService.findOne(id, tenantId);
}
```

## Token Storage

### OAuth Tokens

- Google access tokens and refresh tokens stored encrypted
- AES-256 encryption at rest
- Encryption key stored in environment variable
- Never log or expose tokens in responses
- Refresh tokens used server-side only

### Encryption Implementation

```typescript
import * as crypto from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function encrypt(text: string): string {
  return crypto.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

function decrypt(ciphertext: string): string {
  return crypto.AES.decrypt(ciphertext, ENCRYPTION_KEY).toString(crypto.enc.Utf8);
}
```

## Input Validation

### NestJS Validation Pipe

- Global validation pipe enabled in `main.ts`
- `class-validator` decorators on DTOs
- Whitelist mode: strips unknown properties
- ForbidNonWhitelisted: rejects unknown properties
- Transform: converts types automatically

**Example:**
```typescript
export class CreateContactDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsEnum(['granted', 'revoked'])
  consentStatus: string;
}
```

### Sanitization

- HTML input sanitized for XSS prevention
- SQL injection prevented by Prisma parameterized queries
- Path traversal prevented by input validation

## Rate Limiting

### Public Endpoints

Critical for `/t/{code}` redirect endpoint:

```typescript
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60000, limit: 10 } })
@Get('t/:code')
async redirect(@Param('code') code: string) {
  // ...
}
```

**Configuration:**
- 10 requests per IP per minute for redirects
- 100 requests per IP per minute for authenticated endpoints
- Configurable via environment variables

## CORS

### Configuration

```typescript
app.enableCors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Rules:**
- Only allow specific frontend origin
- Enable credentials for cookies
- Restrict methods and headers
- No wildcard origins in production

## Data Privacy

### PII Handling

- Contact data stored securely
- Consent status tracked for all contacts
- Consent timestamp recorded
- Revocation honored immediately

### GDPR Compliance

- Right to access: Export user data
- Right to erasure: Delete user account
- Right to rectification: Update user data
- Consent management for contacts
- Audit trail for consent changes

### Unsubscribe

- Unique token per contact
- One-click unsubscribe
- Sets `consentStatus = revoked`
- No authentication required
- Immediate effect

## Audit Logging

### Events to Log

1. **Authentication**
   - Login attempts (success/failure)
   - Logout events
   - Session creation/destruction

2. **Integrations**
   - OAuth connections
   - OAuth disconnections
   - Token refresh failures

3. **Data Changes**
   - Reply publishing
   - Campaign sending
   - Contact consent changes
   - Tag creation/updates

4. **Security Events**
   - Failed authorization attempts
   - Rate limit violations
   - Suspicious activity

### Log Format

```json
{
  "timestamp": "2024-01-12T10:30:00.000Z",
  "level": "info",
  "event": "review.reply.published",
  "userId": "uuid",
  "tenantId": "uuid",
  "resourceId": "uuid",
  "ip": "192.168.1.1",
  "userAgent": "..."
}
```

## Environment Variables

### Security

- Never commit `.env` files
- Use `.env.example` as template
- Store secrets in secure vault (production)
- Rotate secrets regularly
- Use different keys per environment

### Required Secrets

- `SESSION_SECRET`: Random string (32+ chars)
- `ENCRYPTION_KEY`: Random string (32 chars for AES-256)
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
- `OPENAI_API_KEY`: From OpenAI
- `SMTP_PASSWORD`: Email service password

## API Security

### Headers

```typescript
// Security headers (use helmet in production)
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true,
}));
```

### Request Limits

- Max request body size: 10MB
- Max JSON payload: 1MB
- Request timeout: 30s
- File upload limits (future feature)

## Database Security

### Connection

- SSL/TLS in production
- Connection pooling limits
- Prepared statements (via Prisma)
- No raw SQL queries

### Permissions

- Application user: Read/write on tables
- No DDL permissions for app user
- Migrations run separately
- Backup user: Read-only

## Monitoring & Alerts

### Security Monitoring

- Failed login attempts
- Rate limit violations
- Unauthorized access attempts
- Token refresh failures
- Unusual API usage patterns

### Alerts

- Multiple failed auth attempts
- Suspicious tenant access patterns
- Encryption/decryption failures
- Integration disconnections

## Production Checklist

- [ ] Enable HTTPS only
- [ ] Set `NODE_ENV=production`
- [ ] Use secure session cookies
- [ ] Enable Helmet security headers
- [ ] Configure CORS properly
- [ ] Rotate all secrets
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Configure audit logging
- [ ] Enable database SSL
- [ ] Set up WAF (Web Application Firewall)
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning
- [ ] Backup and disaster recovery plan

## Incident Response

### In Case of Security Breach

1. Immediately revoke compromised credentials
2. Force logout all sessions
3. Notify affected users
4. Review audit logs
5. Patch vulnerability
6. Document incident
7. Update security measures

### Contacts

- Security Lead: [email]
- DevOps: [email]
- Legal: [email]
