# API Reference

REST API endpoints for revWave.

**Base URL**: `http://localhost:3001` (development)

All endpoints require authentication unless marked as **Public**.

## Health

### GET /health

**Public endpoint** - Check API status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-12T10:30:00.000Z",
  "uptime": 123.45
}
```

## Authentication

### GET /auth/google

Initiate Google OAuth login flow.

Redirects to Google OAuth consent screen.

### GET /auth/google/callback

OAuth callback endpoint (handled by Passport).

Sets session cookie and redirects to dashboard.

### POST /auth/logout

Logout current user and destroy session.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### GET /me

Get current authenticated user information.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://...",
  "tenant": {
    "id": "uuid",
    "name": "My Business"
  }
}
```

## Integrations

### POST /integrations/google/connect

Connect Google Business Profile account.

Initiates OAuth flow with Business Profile scopes.

### GET /integrations

List all integrations for current tenant.

**Response:**
```json
{
  "integrations": [
    {
      "id": "uuid",
      "provider": "google_business",
      "status": "connected",
      "lastSyncAt": "2024-01-12T10:00:00.000Z"
    }
  ]
}
```

## Sync

### POST /sync/google/run

Trigger manual sync of Google Business data.

Fetches locations and reviews from Google API.

**Response:**
```json
{
  "message": "Sync started",
  "syncId": "uuid"
}
```

## Reviews

### GET /reviews

List reviews for current tenant.

**Query Parameters:**
- `locationId` (optional): Filter by location
- `status` (optional): Filter by replied status
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page

**Response:**
```json
{
  "reviews": [
    {
      "id": "uuid",
      "rating": 5,
      "content": "Great service!",
      "reviewerName": "Jane Doe",
      "publishedAt": "2024-01-10T14:30:00.000Z",
      "repliedStatus": "pending",
      "location": {
        "id": "uuid",
        "name": "Main Location"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### POST /reviews/:id/draft

Generate AI draft reply for a review.

**Response:**
```json
{
  "replyId": "uuid",
  "content": "Thank you for your feedback!...",
  "aiGenerated": true,
  "aiModel": "gpt-4"
}
```

### POST /reviews/:id/reply

Publish a reply to Google.

**Request Body:**
```json
{
  "content": "Thank you for your review!"
}
```

**Response:**
```json
{
  "success": true,
  "publishedAt": "2024-01-12T10:30:00.000Z"
}
```

## Tags

### GET /tags

List all tags for current tenant.

**Response:**
```json
{
  "tags": [
    {
      "id": "uuid",
      "publicCode": "abc123",
      "name": "Front Desk NFC",
      "status": "active",
      "location": {
        "id": "uuid",
        "name": "Main Location"
      },
      "tapCount": 42
    }
  ]
}
```

### POST /tags

Create a new tag.

**Request Body:**
```json
{
  "name": "Reception NFC Tag",
  "locationId": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "publicCode": "xyz789",
  "name": "Reception NFC Tag",
  "status": "active"
}
```

### PATCH /tags/:id

Update a tag.

**Request Body:**
```json
{
  "name": "Updated Name",
  "status": "inactive"
}
```

## Public Endpoints

### GET /t/:code

**Public endpoint** - Redirect to Google review page.

Logs tap event and redirects to location's review URL.

**Response:** 302 Redirect or 404 if tag not found.

## Contacts

### GET /contacts

List contacts for current tenant.

**Query Parameters:**
- `consentStatus` (optional): Filter by consent status
- `page`, `limit`: Pagination

**Response:**
```json
{
  "contacts": [
    {
      "id": "uuid",
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "consentStatus": "granted",
      "source": "manual"
    }
  ]
}
```

### POST /contacts

Create a new contact.

**Request Body:**
```json
{
  "email": "customer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "consentStatus": "granted",
  "consentSource": "manual"
}
```

### PATCH /contacts/:id

Update a contact.

### POST /contacts/:id/revoke-consent

Revoke consent for a contact.

## Campaigns

### GET /campaigns

List campaigns for current tenant.

**Response:**
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "name": "Monthly Newsletter",
      "subject": "Updates for January",
      "status": "sent",
      "sentAt": "2024-01-12T09:00:00.000Z",
      "recipientCount": 150
    }
  ]
}
```

### POST /campaigns

Create a new campaign.

**Request Body:**
```json
{
  "name": "Monthly Newsletter",
  "subject": "Updates for January",
  "bodyHtml": "<html>...</html>",
  "scheduledAt": "2024-01-15T09:00:00.000Z"
}
```

### POST /campaigns/:id/send

Send a campaign immediately.

**Response:**
```json
{
  "success": true,
  "recipientCount": 150,
  "sentAt": "2024-01-12T10:30:00.000Z"
}
```

### GET /campaigns/:id/report

Get campaign delivery report.

**Response:**
```json
{
  "campaign": {
    "id": "uuid",
    "name": "Monthly Newsletter"
  },
  "stats": {
    "total": 150,
    "sent": 148,
    "failed": 2,
    "pending": 0
  },
  "recipients": [...]
}
```

## Analytics

### GET /analytics/summary

Get summary analytics for current tenant.

**Query Parameters:**
- `startDate`, `endDate`: Date range

**Response:**
```json
{
  "period": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-12T23:59:59.000Z"
  },
  "reviews": {
    "total": 42,
    "average_rating": 4.7,
    "replied": 38
  },
  "tags": {
    "totalTaps": 156
  },
  "campaigns": {
    "sent": 3,
    "recipients": 450
  }
}
```

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [...]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```
