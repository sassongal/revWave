# Google Business Profile Integration

This module provides integration with Google Business Profile API for managing locations and reviews.

## Architecture

### Services

1. **GoogleBusinessStrategy** - Passport OAuth2 strategy for Google Business Profile authentication
2. **GoogleIntegrationsService** - Manages encrypted token storage and retrieval
3. **GoogleApiService** - Makes API calls to Google Business Profile with automatic token refresh

### Flow

```
User → Connect OAuth → Store Encrypted Tokens → API Service → Google API
                ↓                                      ↓
          Integration Table                    Auto Token Refresh
```

## GoogleApiService

The `GoogleApiService` provides a clean interface for interacting with Google Business Profile API.

### Features

- **Automatic Token Refresh**: Detects expired tokens (5-minute buffer) and automatically refreshes them
- **Retry Logic**: Exponential backoff with 3 retries (1s, 2s, 4s delays)
- **Secure Token Handling**: Never logs raw tokens
- **Error Handling**: Meaningful error messages without exposing sensitive data

### Methods

#### `getAccessToken(tenantId: string): Promise<string>`
Retrieves a valid access token for the tenant. Automatically refreshes if expired.

**Throws**:
- `UnauthorizedException` - If integration not found, not connected, or refresh token expired
- `Error` - If token refresh fails

#### `listLocations(tenantId: string): Promise<GoogleLocation[]>`
Lists all Google Business Profile locations for the tenant.

**Returns**: Array of locations with name, title, address, phone, website

**Example Response**:
```json
{
  "success": true,
  "count": 2,
  "locations": [
    {
      "name": "locations/12345",
      "title": "My Business",
      "storefrontAddress": {
        "addressLines": ["123 Main St"],
        "locality": "San Francisco",
        "administrativeArea": "CA",
        "postalCode": "94102",
        "regionCode": "US"
      },
      "phoneNumbers": {
        "primaryPhone": "+1-555-123-4567"
      }
    }
  ]
}
```

#### `listReviews(tenantId: string, locationName: string): Promise<GoogleReview[]>`
Lists reviews for a specific location.

**Parameters**:
- `tenantId` - The tenant ID
- `locationName` - Full location resource name (e.g., "locations/12345")

**Returns**: Array of reviews with reviewer info, rating, comment, timestamps

**Example Response**:
```json
{
  "success": true,
  "count": 5,
  "reviews": [
    {
      "name": "locations/12345/reviews/abc123",
      "reviewId": "abc123",
      "reviewer": {
        "displayName": "John Doe",
        "profilePhotoUrl": "https://..."
      },
      "starRating": "FIVE",
      "comment": "Great service!",
      "createTime": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `updateLastSync(tenantId: string): Promise<void>`
Updates the `lastSyncAt` timestamp for the integration.

## API Endpoints

### GET `/integrations/google/locations`
Lists all locations for the current tenant.

**Authentication**: Requires valid session with tenant context

**Response**:
```json
{
  "success": true,
  "count": 2,
  "locations": [...]
}
```

### GET `/integrations/google/locations/:locationId/reviews`
Lists reviews for a specific location.

**Authentication**: Requires valid session with tenant context

**Parameters**:
- `locationId` - The location ID (without "locations/" prefix)

**Response**:
```json
{
  "success": true,
  "count": 5,
  "reviews": [...]
}
```

## Error Handling

### Token Expiration
When an access token expires, the service automatically:
1. Detects expiration (5-minute buffer before actual expiry)
2. Uses refresh token to obtain new access token
3. Encrypts and stores new access token
4. Updates `tokenExpiresAt` in database
5. Returns the new token

### Refresh Token Expiration
If the refresh token is invalid or expired:
1. Integration status set to `'error'`
2. Throws `UnauthorizedException` with message: "Refresh token expired. Please reconnect Google Business Profile."
3. User must reconnect via OAuth flow

### API Errors
- **4xx Errors** (except 401): No retry, immediate error response
- **5xx Errors**: Retry with exponential backoff (1s, 2s, 4s)
- **Network Errors**: Retry with exponential backoff

## Token Security

- All tokens stored encrypted using AES-256-GCM via `EncryptionService`
- Raw tokens never logged or exposed in error messages
- Access tokens decrypted only when needed for API calls
- Refresh tokens only decrypted during token refresh

## Google Business Profile API

### API Versions
- **Locations**: `mybusinessbusinessinformation.googleapis.com/v1`
- **Reviews**: `mybusiness.googleapis.com/v4`

### Required Scopes
- `https://www.googleapis.com/auth/business.manage`
- `https://www.googleapis.com/auth/userinfo.email`

### Rate Limits
Google Business Profile API has rate limits. The service implements retry logic to handle transient errors, but sustained high traffic may require implementing request queuing.

## Usage Example

```typescript
import { GoogleApiService } from './integrations/google/google-api.service';

@Injectable()
export class ReviewsSyncService {
  constructor(private readonly googleApi: GoogleApiService) {}

  async syncReviewsForTenant(tenantId: string) {
    // List all locations
    const locations = await this.googleApi.listLocations(tenantId);

    for (const location of locations) {
      // Get reviews for each location
      const reviews = await this.googleApi.listReviews(tenantId, location.name);

      // Process reviews...
      await this.processReviews(tenantId, location, reviews);
    }

    // Update last sync timestamp
    await this.googleApi.updateLastSync(tenantId);
  }
}
```

## Testing

To test the integration:

1. Connect Google Business Profile via OAuth:
   ```
   POST /integrations/google/connect
   ```

2. List locations:
   ```
   GET /integrations/google/locations
   ```

3. List reviews for a location:
   ```
   GET /integrations/google/locations/{locationId}/reviews
   ```

## Future Enhancements

- Pagination support for large result sets
- Webhook support for real-time review notifications
- Reply to reviews functionality
- Location management (create, update, delete)
- Insights and analytics
- Multiple account support
