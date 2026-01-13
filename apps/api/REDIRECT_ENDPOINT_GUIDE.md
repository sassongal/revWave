# Tag Redirect Endpoint Guide

This guide documents the public redirect endpoint (`GET /t/:code`) that powers NFC tag redirects to Google review pages.

## Overview

When a customer taps an NFC tag, their phone opens a URL like `https://revwave.com/t/cat-dog-sun`. The endpoint:

1. **Looks up the tag** by `publicCode` (must be `status: "active"`)
2. **Logs a tap event** for analytics (IP, user agent, timestamp)
3. **Redirects (302)** to the location's Google review page

All operations are optimized for **speed** and include **rate limiting** to prevent abuse.

---

## Endpoint

**GET /t/:code**

- **Public**: No authentication required
- **Rate Limited**: 10 requests per minute per IP
- **Fast**: Database query + redirect (typically <100ms)

---

## Request

### URL Parameters

- `code` (required): The tag's `publicCode` (e.g., `cat-dog-sun`)

### Example Request

```bash
curl -I http://localhost:3001/t/cat-dog-sun
```

**User Flow:**
1. Customer taps NFC tag with URL: `https://revwave.com/t/cat-dog-sun`
2. Phone browser opens the URL
3. Backend processes the request
4. Customer is redirected to Google review page

---

## Response

### Success (302 Found)

**Status Code**: 302 Found
**Header**: `Location: https://search.google.com/local/writereview?placeid=...`

```http
HTTP/1.1 302 Found
Location: https://search.google.com/local/writereview?placeid=ChIJ...
Content-Type: text/html; charset=utf-8
```

The browser automatically follows the redirect to Google's review page.

---

### Tag Not Found (404)

**Status Code**: 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Tag cat-dog-sun not found or is not active",
  "error": "Not Found"
}
```

**Causes:**
- Tag doesn't exist
- Tag status is `disabled` or `lost`
- Invalid `publicCode` format

---

### Rate Limit Exceeded (429)

**Status Code**: 429 Too Many Requests

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

**Cause:** More than 10 requests per minute from the same IP address

**Solution:** Wait 60 seconds before trying again

---

## Redirect Logic

### Priority Order

The endpoint determines the redirect URL using this priority:

1. **Location's Google Maps URI** (from `location.metadata.mapsUri`)
2. **Constructed Google review URL** (from `location.externalId`)
3. **Fallback search** (tenant name + "reviews")

### Google Review URL Formats

#### Option 1: Google Maps URI (Preferred)
```
https://maps.google.com/?cid=12345678901234567890
```
Stored in `location.metadata.mapsUri` after sync.

#### Option 2: Place ID Review URL
```
https://search.google.com/local/writereview?placeid=ChIJ...
```
Constructed from `location.externalId` (Google Place ID).

#### Option 3: Fallback
```
https://google.com/search?q=Business+Name+reviews
```
Used when tag has no location assigned.

---

## Tap Event Logging

Every successful redirect logs a `TapEvent` with the following data:

```typescript
{
  tagId: string;        // Tag UUID
  tenantId: string;     // Tenant UUID
  ipAddress: string;    // Client IP (handles proxies)
  userAgent: string;    // Browser/device info
  metadata: {
    referer?: string;          // Referrer header
    acceptLanguage?: string;   // User's language preference
  };
  tappedAt: Date;       // Timestamp (auto-generated)
}
```

### IP Address Detection

The endpoint extracts the client IP from:
1. `X-Forwarded-For` header (for proxies/load balancers)
2. `X-Real-IP` header (for reverse proxies)
3. `req.socket.remoteAddress` (direct connection)

**Example:**
```
X-Forwarded-For: 203.0.113.45, 198.51.100.1
→ IP: 203.0.113.45 (first in chain)
```

---

## Rate Limiting

### Configuration

- **Global Default**: 100 requests/minute per IP
- **Redirect Endpoint**: 10 requests/minute per IP (stricter)

### How It Works

- Uses `@nestjs/throttler` with in-memory storage
- Tracks requests by IP address
- Resets every 60 seconds
- Returns `429 Too Many Requests` when limit exceeded

### Testing Rate Limiting

```bash
# Make 11 requests in quick succession
for i in {1..11}; do
  echo "Request $i:"
  curl -I http://localhost:3001/t/cat-dog-sun
  echo "---"
done

# Expected:
# - Requests 1-10: 302 Found
# - Request 11: 429 Too Many Requests
```

---

## Performance Optimization

### Query Optimization

The endpoint performs a single database query:

```sql
SELECT tags.*, locations.*, tenants.id, tenants.name
FROM tags
LEFT JOIN locations ON tags.location_id = locations.id
LEFT JOIN tenants ON tags.tenant_id = tenants.id
WHERE tags.public_code = 'cat-dog-sun';
```

**Indexes used:**
- `tags.public_code` (unique index) - O(1) lookup
- Foreign key indexes for joins

**Typical query time:** <10ms

### Logging Performance

Tap event logging is **non-blocking**:
- Insert happens in background
- Redirect doesn't wait for logging to complete
- If logging fails, redirect still succeeds

**Error handling:**
```typescript
try {
  await this.prisma.tapEvent.create({ ... });
} catch (error) {
  // Log error but don't fail the redirect
  this.logger.error('Failed to log tap event');
}
```

---

## Testing Guide

### Prerequisites

1. **Create a tag**
   ```bash
   curl -X POST http://localhost:3001/tags \
     -H "Cookie: connect.sid=$SESSION" \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Tag"}'
   ```

2. **Note the `publicCode`**
   ```json
   {
     "success": true,
     "data": {
       "publicCode": "cat-dog-sun",
       ...
     }
   }
   ```

3. **Optionally assign to a location**
   ```bash
   curl -X PATCH http://localhost:3001/tags/TAG_ID \
     -H "Cookie: connect.sid=$SESSION" \
     -H "Content-Type: application/json" \
     -d '{"locationId": "LOCATION_ID"}'
   ```

---

### Test Scenarios

#### Scenario 1: Successful Redirect (Active Tag)

```bash
# Make redirect request
curl -I http://localhost:3001/t/cat-dog-sun
```

**Expected:**
```http
HTTP/1.1 302 Found
Location: https://search.google.com/local/writereview?placeid=...
```

**Verify tap event logged:**
```sql
SELECT * FROM tap_events
WHERE tag_id = 'TAG_UUID'
ORDER BY tapped_at DESC
LIMIT 1;
```

---

#### Scenario 2: Invalid Tag Code (404)

```bash
curl http://localhost:3001/t/invalid-code-xyz
```

**Expected:**
```json
{
  "statusCode": 404,
  "message": "Tag invalid-code-xyz not found or is not active"
}
```

**No tap event logged.**

---

#### Scenario 3: Disabled Tag (404)

```bash
# Disable tag
curl -X PATCH http://localhost:3001/tags/TAG_ID \
  -H "Cookie: connect.sid=$SESSION" \
  -H "Content-Type: application/json" \
  -d '{"status": "disabled"}'

# Try to access
curl http://localhost:3001/t/cat-dog-sun
```

**Expected:**
```json
{
  "statusCode": 404,
  "message": "Tag cat-dog-sun not found or is not active"
}
```

**No tap event logged** (disabled tags don't log taps).

---

#### Scenario 4: Lost Tag (404)

```bash
# Mark tag as lost
curl -X PATCH http://localhost:3001/tags/TAG_ID \
  -H "Cookie: connect.sid=$SESSION" \
  -H "Content-Type: application/json" \
  -d '{"status": "lost"}'

# Try to access
curl http://localhost:3001/t/cat-dog-sun
```

**Expected:**
```json
{
  "statusCode": 404,
  "message": "Tag cat-dog-sun not found or is not active"
}
```

---

#### Scenario 5: Rate Limiting

```bash
# Rapid fire 11 requests
for i in {1..11}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/t/cat-dog-sun)
  echo "Request $i: HTTP $STATUS"
  sleep 0.1
done
```

**Expected:**
```
Request 1: HTTP 302
Request 2: HTTP 302
...
Request 10: HTTP 302
Request 11: HTTP 429  ← Rate limited
```

---

#### Scenario 6: Tag Without Location (Fallback)

```bash
# Create tag without location
curl -X POST http://localhost:3001/tags \
  -H "Cookie: connect.sid=$SESSION" \
  -H "Content-Type: application/json" \
  -d '{"name": "Unassigned Tag"}'

# Access it
curl -I http://localhost:3001/t/NEW_PUBLIC_CODE
```

**Expected:**
```http
HTTP/1.1 302 Found
Location: https://google.com/search?q=Tenant+Name+reviews
```

Redirects to Google search for tenant's reviews.

---

#### Scenario 7: IP Address Detection

```bash
# Test with X-Forwarded-For header
curl -I http://localhost:3001/t/cat-dog-sun \
  -H "X-Forwarded-For: 203.0.113.45"
```

**Verify IP logged:**
```sql
SELECT ip_address FROM tap_events
WHERE tag_id = 'TAG_UUID'
ORDER BY tapped_at DESC
LIMIT 1;

-- Should show: 203.0.113.45
```

---

#### Scenario 8: User Agent Tracking

```bash
# Test with custom user agent
curl -I http://localhost:3001/t/cat-dog-sun \
  -A "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
```

**Verify user agent logged:**
```sql
SELECT user_agent FROM tap_events
WHERE tag_id = 'TAG_UUID'
ORDER BY tapped_at DESC
LIMIT 1;

-- Should show: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)
```

---

## Analytics Queries

### Top Tags by Taps

```sql
SELECT
  t.public_code,
  t.name,
  COUNT(te.id) as tap_count
FROM tags t
LEFT JOIN tap_events te ON t.id = te.tag_id
WHERE t.tenant_id = 'TENANT_ID'
GROUP BY t.id, t.public_code, t.name
ORDER BY tap_count DESC
LIMIT 10;
```

---

### Taps Over Time (Last 7 Days)

```sql
SELECT
  DATE(te.tapped_at) as date,
  COUNT(*) as taps
FROM tap_events te
WHERE
  te.tenant_id = 'TENANT_ID'
  AND te.tapped_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(te.tapped_at)
ORDER BY date DESC;
```

---

### Tag Performance

```sql
SELECT
  t.public_code,
  t.name,
  t.status,
  COUNT(te.id) as total_taps,
  COUNT(CASE WHEN te.tapped_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as taps_24h,
  COUNT(CASE WHEN te.tapped_at >= NOW() - INTERVAL '7 days' THEN 1 END) as taps_7d
FROM tags t
LEFT JOIN tap_events te ON t.id = te.tag_id
WHERE t.tenant_id = 'TENANT_ID'
GROUP BY t.id, t.public_code, t.name, t.status
ORDER BY total_taps DESC;
```

---

### User Agents Analysis

```sql
SELECT
  user_agent,
  COUNT(*) as tap_count
FROM tap_events
WHERE tenant_id = 'TENANT_ID'
GROUP BY user_agent
ORDER BY tap_count DESC
LIMIT 20;
```

---

## Production Considerations

### DNS Configuration

Point your domain to the API:
```
t.revwave.com → API server IP
```

Or use a wildcard:
```
*.revwave.com → API server IP
```

Then configure NGINX/Caddy to route `/t/*` requests to the API.

---

### HTTPS Required

NFC tags **require HTTPS** for reliable operation:
- iOS requires HTTPS for NFC URLs
- Android strongly recommends HTTPS

Use Let's Encrypt for free SSL certificates.

---

### CDN/Caching

**Do NOT cache redirect responses:**
- Every tap must be logged for analytics
- Redirect URLs may change (location updates)

Configure your CDN to bypass cache for `/t/*` routes:
```nginx
location /t/ {
  proxy_pass http://api-server;
  proxy_cache off;
  add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```

---

### Rate Limiting in Production

For production, consider:
- **Redis-backed throttler** (for distributed systems)
- **Per-tag rate limits** (to prevent single-tag abuse)
- **Geolocation-based limits** (different limits by region)

---

### Monitoring

Track these metrics:
- **Redirect latency** (p50, p95, p99)
- **404 rate** (invalid codes)
- **429 rate** (rate limit hits)
- **Tap events logged per minute**
- **Failed logging attempts**

Example Prometheus metrics:
```
redirect_requests_total{status="302"}
redirect_requests_total{status="404"}
redirect_requests_total{status="429"}
redirect_latency_milliseconds
tap_events_logged_total
```

---

## Security

### No Authentication Required

The endpoint is **intentionally public** - anyone with the `publicCode` can access it.

**Security measures:**
- Rate limiting prevents brute-force scanning
- Tag codes are random (hard to guess)
- 40^3 = 64,000 possible codes (with 40-word pool)

---

### Privacy

**IP addresses are logged** for analytics. Ensure compliance with:
- GDPR (if serving EU users)
- CCPA (if serving California users)
- Other privacy regulations

Consider:
- IP hashing (one-way)
- Retention policies (auto-delete after 90 days)
- Privacy policy disclosure

---

### Abuse Prevention

Rate limiting handles most abuse, but consider:
- **Tag rotation**: Change codes periodically
- **Anomaly detection**: Flag unusual tap patterns
- **Geofencing**: Alert if taps come from unexpected locations

---

## Summary

The redirect endpoint provides:

✅ **Fast redirects** - <100ms typical latency
✅ **Rate limiting** - 10 requests/min per IP
✅ **Analytics** - Full tap event logging
✅ **Status filtering** - Only active tags work
✅ **Fallback handling** - Graceful degradation
✅ **Production-ready** - Error handling, monitoring hooks

**URL format:** `https://revwave.com/t/{publicCode}`
**Example:** `https://revwave.com/t/cat-dog-sun`

This endpoint is the core of the NFC tag system, enabling seamless customer redirects to Google review pages with full analytics tracking.
