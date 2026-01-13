# Manual Testing Guide: Reply Publishing

This guide provides step-by-step instructions for manually testing the reply publishing feature that publishes review replies to Google Business Profile.

## Prerequisites

1. **Running API server**
   ```bash
   cd apps/api
   pnpm dev
   ```

2. **Authenticated session**
   - User must be logged in via Google OAuth
   - Session cookie must be present in requests

3. **Google Business Profile integration**
   - Tenant must have connected Google Business Profile
   - Integration status must be 'connected'
   - Valid OAuth tokens must exist

4. **Test data setup**
   - At least one location synced from Google
   - At least one review with externalId
   - Review must have a draft reply generated

## Test Scenarios

### Scenario 1: Successful Reply Publishing

**Setup:**
1. Run sync to get reviews:
   ```bash
   curl -X POST http://localhost:3001/sync/google/run \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

2. Get a review ID to test with:
   ```bash
   curl http://localhost:3001/reviews \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
   ```

3. Generate a draft reply for the review:
   ```bash
   curl -X POST http://localhost:3001/reviews/REVIEW_ID/draft \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

**Test Steps:**
1. Publish the reply:
   ```bash
   curl -X POST http://localhost:3001/reviews/REVIEW_ID/reply \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

**Expected Response:**
```json
{
  "success": true,
  "message": "Reply published successfully",
  "replyId": "uuid-of-published-reply"
}
```

**Database Verification:**
1. Check Reply record:
   ```sql
   SELECT id, content, "is_draft", "published_at", "published_by"
   FROM replies
   WHERE id = 'REPLY_ID';
   ```
   - `is_draft` should be `false`
   - `published_at` should have a timestamp
   - `published_by` should have the user ID

2. Check Review record:
   ```sql
   SELECT id, "external_id", "reply_status"
   FROM reviews
   WHERE id = 'REVIEW_ID';
   ```
   - `reply_status` should be `'replied'`

**Google Verification:**
- Log into Google Business Profile
- Navigate to the location
- Find the review
- Verify the reply appears on the review

---

### Scenario 2: Review Not Found

**Test Steps:**
1. Try to publish reply for non-existent review:
   ```bash
   curl -X POST http://localhost:3001/reviews/00000000-0000-0000-0000-000000000000/reply \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

**Expected Response:**
```json
{
  "success": false,
  "message": "Review not found or does not belong to your organization"
}
```

---

### Scenario 3: No Draft Reply Available

**Test Steps:**
1. Find a review without a draft:
   ```bash
   curl http://localhost:3001/reviews?filter=pending \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
   ```

2. Try to publish reply without creating a draft first:
   ```bash
   curl -X POST http://localhost:3001/reviews/REVIEW_ID/reply \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

**Expected Response:**
```json
{
  "success": false,
  "message": "No draft reply found for this review"
}
```

---

### Scenario 4: Missing External ID

**Setup:**
1. Create a review manually in the database without an externalId:
   ```sql
   INSERT INTO reviews (id, "tenant_id", "location_id", rating, "reviewer_name", "review_status", "reply_status")
   VALUES (gen_random_uuid(), 'TENANT_ID', 'LOCATION_ID', 5, 'Test Reviewer', 'visible', 'pending');
   ```

2. Generate a draft for this review

**Test Steps:**
1. Try to publish the reply:
   ```bash
   curl -X POST http://localhost:3001/reviews/REVIEW_ID/reply \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

**Expected Response:**
```json
{
  "success": false,
  "message": "Review does not have a Google review ID"
}
```

---

### Scenario 5: Google API Error Handling

**Test Steps:**
1. Temporarily invalidate the Google OAuth tokens (or wait for expiration)

2. Try to publish a reply:
   ```bash
   curl -X POST http://localhost:3001/reviews/REVIEW_ID/reply \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

**Expected Response:**
```json
{
  "success": false,
  "message": "Failed to publish reply: [error details]"
}
```

**Database Verification:**
1. Check Review record:
   ```sql
   SELECT id, "reply_status"
   FROM reviews
   WHERE id = 'REVIEW_ID';
   ```
   - `reply_status` should be reset to `'pending'`

2. Check Reply record:
   ```sql
   SELECT id, "is_draft"
   FROM replies
   WHERE "review_id" = 'REVIEW_ID';
   ```
   - `is_draft` should still be `true` (not updated)

**Note:** The system will attempt to refresh the access token automatically if it's expired. This test verifies handling of truly invalid credentials.

---

### Scenario 6: Unauthorized Access (Different Tenant)

**Setup:**
1. Log in as User A (Tenant A)
2. Get a review ID from Tenant A
3. Log out and log in as User B (Tenant B)

**Test Steps:**
1. Try to publish a reply for Tenant A's review as Tenant B:
   ```bash
   curl -X POST http://localhost:3001/reviews/TENANT_A_REVIEW_ID/reply \
     -H "Cookie: connect.sid=TENANT_B_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

**Expected Response:**
```json
{
  "success": false,
  "message": "Review not found or does not belong to your organization"
}
```

---

### Scenario 7: Token Refresh During Publish

**Setup:**
1. Set up integration with tokens that are about to expire (within 5 minutes)

**Test Steps:**
1. Publish a reply:
   ```bash
   curl -X POST http://localhost:3001/reviews/REVIEW_ID/reply \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

**Expected Behavior:**
- System automatically refreshes the access token
- Publishing succeeds
- New token is stored in database

**Verification:**
1. Check logs for token refresh message:
   ```
   [GoogleApiService] Access token expired or expiring soon for tenant TENANT_ID, refreshing...
   [GoogleApiService] Successfully refreshed access token for tenant TENANT_ID
   ```

2. Check Integration record:
   ```sql
   SELECT "access_token", "token_expires_at"
   FROM integrations
   WHERE "tenant_id" = 'TENANT_ID' AND provider = 'google_business';
   ```
   - `token_expires_at` should be updated to a future timestamp

---

### Scenario 8: Double Publishing Prevention

**Test Steps:**
1. Successfully publish a reply (follow Scenario 1)

2. Try to publish again for the same review:
   ```bash
   curl -X POST http://localhost:3001/reviews/REVIEW_ID/reply \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

**Expected Response:**
```json
{
  "success": false,
  "message": "No draft reply found for this review"
}
```

**Explanation:** Once published, the draft is marked as `is_draft=false`, so there's no draft available to publish again.

---

## API Logs to Monitor

When running tests, monitor the API logs for these key messages:

### Success Path:
```
[ReviewsController] Publishing reply for review REVIEW_ID (tenant: TENANT_ID)
[GoogleApiService] Publishing reply to review EXTERNAL_REVIEW_ID
[GoogleApiService] Successfully published reply to review EXTERNAL_REVIEW_ID
[RepliesService] Publishing reply REPLY_ID
[ReviewsController] Successfully published reply REPLY_ID for review REVIEW_ID
```

### Error Path:
```
[ReviewsController] Publishing reply for review REVIEW_ID (tenant: TENANT_ID)
[GoogleApiService] Publishing reply to review EXTERNAL_REVIEW_ID
[GoogleApiService] Failed to refresh access token for tenant TENANT_ID
[ReviewsController] Failed to publish reply for review REVIEW_ID: [error message]
```

---

## Common Issues and Troubleshooting

### Issue: "No draft reply found"
**Cause:** Draft was not created or was already published
**Fix:** Generate a new draft with POST /reviews/:id/draft

### Issue: "Google Business Profile not connected"
**Cause:** Integration not set up or disconnected
**Fix:** Complete Google OAuth flow via /integrations/google/auth

### Issue: "Refresh token expired"
**Cause:** User has revoked access or token is invalid
**Fix:** Reconnect Google Business Profile integration

### Issue: "401 Unauthorized"
**Cause:** Session expired or missing
**Fix:** Log in again to get a new session

### Issue: "Review does not have a Google review ID"
**Cause:** Review was created manually or sync failed to capture externalId
**Fix:** Run sync again or manually set externalId

---

## Environment Variables

Ensure these are configured in `.env.local`:

```env
GOOGLE_BUSINESS_CLIENT_ID=your-client-id
GOOGLE_BUSINESS_CLIENT_SECRET=your-client-secret
DATABASE_URL=postgresql://revwave:revwave123@localhost:5432/revwave
```

---

## Quick Test Script

Save this as `test-reply-publishing.sh`:

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:3001"
SESSION_COOKIE="YOUR_SESSION_COOKIE_HERE"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=== Reply Publishing Test ==="
echo ""

# Step 1: Get reviews
echo "1. Fetching reviews..."
REVIEWS=$(curl -s -X GET "$API_URL/reviews?filter=pending" \
  -H "Cookie: connect.sid=$SESSION_COOKIE")

REVIEW_ID=$(echo $REVIEWS | jq -r '.data[0].id')

if [ "$REVIEW_ID" == "null" ]; then
  echo -e "${RED}No pending reviews found${NC}"
  exit 1
fi

echo -e "${GREEN}Found review: $REVIEW_ID${NC}"
echo ""

# Step 2: Generate draft
echo "2. Generating draft reply..."
DRAFT=$(curl -s -X POST "$API_URL/reviews/$REVIEW_ID/draft" \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json")

DRAFT_TEXT=$(echo $DRAFT | jq -r '.draftText')
REPLY_ID=$(echo $DRAFT | jq -r '.replyId')

echo -e "${GREEN}Draft generated: $DRAFT_TEXT${NC}"
echo "Reply ID: $REPLY_ID"
echo ""

# Step 3: Publish reply
echo "3. Publishing reply to Google..."
RESULT=$(curl -s -X POST "$API_URL/reviews/$REVIEW_ID/reply" \
  -H "Cookie: connect.sid=$SESSION_COOKIE" \
  -H "Content-Type: application/json")

SUCCESS=$(echo $RESULT | jq -r '.success')

if [ "$SUCCESS" == "true" ]; then
  echo -e "${GREEN}✓ Reply published successfully!${NC}"
  echo $RESULT | jq '.'
else
  echo -e "${RED}✗ Publishing failed${NC}"
  echo $RESULT | jq '.'
  exit 1
fi

echo ""
echo "=== Test Complete ==="
```

Make it executable:
```bash
chmod +x test-reply-publishing.sh
```

Run it:
```bash
./test-reply-publishing.sh
```

---

## Summary

The reply publishing endpoint implements the following flow:

1. **Verification**: Checks that review exists and belongs to tenant
2. **Validation**: Ensures review has external ID and a draft reply
3. **Publishing**: Calls Google API to publish the reply
4. **Database Update**: Marks reply as published and updates review status
5. **Error Handling**: Rolls back status changes on failure

All operations are tenant-scoped and properly logged for debugging and auditing purposes.
